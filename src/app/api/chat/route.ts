/**
 * Encompass Chat API — Main agent endpoint
 * Merges Compass agent loop with Co-Presenter voice/memory pattern.
 *
 * POST /api/chat
 * Body: { message, sessionId?, voice?: boolean }
 * Returns: { reply, citations, spoken?, html?, sessionId, tier, actions }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/helpers";
import { runEncompassLoop } from "@/lib/agent/loop";
import { buildEncompassPrompt } from "@/lib/agent/prompt";
import { getUserMemories, getChatHistory, saveChatMessages, extractAndSaveMemories } from "@/lib/agent/memory";
import { logAudit } from "@/lib/audit";
import prisma from "@/lib/db";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300; // 5 min for Vercel

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Auth
  const authCtx = await getAuthContext();
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  const body = await req.json();
  const message: string = body.message?.trim();
  const voice: boolean = body.voice === true;

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Get or create session
  let sessionId = body.sessionId;
  if (!sessionId) {
    const session = await prisma.chatSession.create({
      data: {
        orgId: authCtx.orgId,
        memberId: authCtx.memberId,
        title: message.slice(0, 100),
      },
    });
    sessionId = session.id;
  }

  // Build context
  const [org, memories, history, docStats] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: authCtx.orgId },
      select: { name: true, slug: true, personaFile: true },
    }),
    getUserMemories(authCtx.memberId),
    getChatHistory(sessionId, 10),
    getDocumentStats(authCtx.orgId),
  ]);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const member = await prisma.orgMember.findUnique({
    where: { id: authCtx.memberId },
    select: { displayName: true, role: true, department: true, title: true },
  });

  // Build system prompt
  const systemPrompt = buildEncompassPrompt({
    org: { name: org.name, slug: org.slug, personaFile: org.personaFile },
    member: {
      displayName: member?.displayName,
      role: member?.role || "member",
      department: member?.department,
      title: member?.title,
    },
    memories,
    documentStats: docStats,
  });

  // Build messages array from history + current message
  const messages: Anthropic.Messages.MessageParam[] = [];
  for (const h of history) {
    messages.push({
      role: h.role === "user" ? "user" : "assistant",
      content: h.content,
    });
  }
  messages.push({ role: "user", content: message });

  // Run agent loop
  const result = await runEncompassLoop(messages, systemPrompt, {
    orgId: authCtx.orgId,
    memberId: authCtx.memberId,
    memberRole: authCtx.memberRole,
    memberDept: authCtx.memberDept,
  });

  const latencyMs = Date.now() - startTime;

  // Generate spoken text if voice requested
  let spoken: string | undefined;
  if (voice && result.reply) {
    spoken = cleanForSpeech(result.reply);
  }

  // Save chat messages (non-blocking)
  saveChatMessages(
    sessionId,
    message,
    result.reply,
    spoken,
    result.actionsTaken,
    result.tokenCount,
    latencyMs,
  ).catch((e) => console.error("Chat save failed:", e));

  // Extract memories (non-blocking)
  extractAndSaveMemories(authCtx.memberId, message, result.reply)
    .catch((e) => console.error("Memory extraction failed:", e));

  // Audit log (non-blocking)
  logAudit(authCtx.orgId, "query", {
    query: message,
    response_summary: result.reply.slice(0, 200),
    session_id: sessionId,
    tool_calls: result.actionsTaken.map((a) => ({ tool: a.tool, success: a.success })),
    token_count: result.tokenCount,
    latency_ms: latencyMs,
  }, authCtx.clerkUserId).catch(() => {});

  // Update org token usage (non-blocking)
  prisma.organization.update({
    where: { id: authCtx.orgId },
    data: { tokensUsed: { increment: result.tokenCount } },
  }).catch(() => {});

  return NextResponse.json({
    reply: result.reply,
    html: result.html,
    spoken,
    sessionId,
    tier: result.tier,
    actions: result.actionsTaken,
    tokenCount: result.tokenCount,
    latencyMs,
  });
}

/**
 * Clean text for TTS — remove markdown, citations, URLs.
 */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\[Doc:\s*[^\]]+\]/g, "")           // Remove citation brackets
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")      // Markdown links -> text
    .replace(/https?:\/\/\S+/g, "")               // URLs
    .replace(/\*\*([^*]+)\*\*/g, "$1")            // Bold
    .replace(/\*([^*]+)\*/g, "$1")                // Italic
    .replace(/#{1,3}\s+/g, "")                    // Headings
    .replace(/`[^`]+`/g, "")                       // Inline code
    .replace(/```[\s\S]*?```/g, "")               // Code blocks
    .replace(/\|[^|]+\|/g, "")                    // Table cells
    .replace(/-{3,}/g, "")                        // Horizontal rules
    .replace(/\n{2,}/g, ". ")                     // Paragraphs to periods
    .replace(/\s+/g, " ")
    .trim();
}

async function getDocumentStats(orgId: string) {
  const docs = await prisma.document.findMany({
    where: { orgId, status: "indexed" },
    select: { category: true },
  });

  const categories: Record<string, number> = {};
  for (const doc of docs) {
    const cat = doc.category || "uncategorized";
    categories[cat] = (categories[cat] || 0) + 1;
  }

  return { total: docs.length, categories };
}

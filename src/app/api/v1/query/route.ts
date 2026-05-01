/**
 * Public API: POST /api/v1/query
 * Ask a question via API key.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-keys";
import { runEncompassLoop } from "@/lib/agent/loop";
import { buildEncompassPrompt } from "@/lib/agent/prompt";
import { logAudit } from "@/lib/audit";
import prisma from "@/lib/db";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("X-API-Key") || "";
  const keyCtx = await validateApiKey(apiKey);
  if (!keyCtx || !keyCtx.permissions.includes("query")) {
    return NextResponse.json({ error: "Invalid or unauthorized API key" }, { status: 401 });
  }

  const body = await req.json();
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: keyCtx.orgId },
    select: { name: true, slug: true, personaFile: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const docs = await prisma.document.findMany({
    where: { orgId: keyCtx.orgId, status: "indexed" },
    select: { category: true },
  });
  const categories: Record<string, number> = {};
  for (const d of docs) {
    const c = d.category || "uncategorized";
    categories[c] = (categories[c] || 0) + 1;
  }

  const systemPrompt = buildEncompassPrompt({
    org: { name: org.name, slug: org.slug, personaFile: org.personaFile },
    member: { displayName: "API User", role: "member" },
    memories: [],
    documentStats: { total: docs.length, categories },
  });

  const result = await runEncompassLoop(
    [{ role: "user", content: message }],
    systemPrompt,
    { orgId: keyCtx.orgId, memberId: "api", memberRole: "member" },
  );

  logAudit(keyCtx.orgId, "api_call", {
    query: message,
    response_summary: result.reply.slice(0, 200),
    api_key_prefix: apiKey.slice(0, 12),
    token_count: result.tokenCount,
  }).catch(() => {});

  return NextResponse.json({
    reply: result.reply,
    tier: result.tier,
    tokenCount: result.tokenCount,
  });
}

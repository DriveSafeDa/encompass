/**
 * Encompass Memory System
 * Merged from Co-Presenter (regex + Claude extraction) and Compass (Haiku dedup).
 * Per-user persistent memory within org scope.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "../db";

const HAIKU = "claude-haiku-4-5-20251001";
const MAX_MEMORIES = 50;

/**
 * Get user memories for prompt injection.
 */
export async function getUserMemories(
  memberId: string,
): Promise<Array<{ key: string; category: string; content: string }>> {
  const memories = await prisma.memoryNode.findMany({
    where: { memberId },
    orderBy: { updatedAt: "desc" },
    take: MAX_MEMORIES,
    select: { key: true, category: true, content: true },
  });
  return memories;
}

/**
 * Get chat history for a session.
 */
export async function getChatHistory(
  sessionId: string,
  limit = 10,
): Promise<Array<{ role: string; content: string }>> {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { role: true, content: true },
  });
  return messages.reverse();
}

/**
 * Save chat messages to the database.
 */
export async function saveChatMessages(
  sessionId: string,
  userMessage: string,
  assistantReply: string,
  spokenText?: string,
  toolCalls?: unknown[],
  tokenCount?: number,
  latencyMs?: number,
): Promise<void> {
  try {
    await prisma.chatMessage.createMany({
      data: [
        { sessionId, role: "user", content: userMessage },
        {
          sessionId,
          role: "assistant",
          content: assistantReply,
          spokenText: spokenText || null,
          toolCalls: toolCalls ? (toolCalls as any) : undefined,
          tokenCount,
          latencyMs,
        },
      ],
    });
  } catch (e) {
    console.error("Failed to save chat messages:", e);
  }
}

/**
 * Extract and save memories from a conversation turn.
 * Non-blocking — call with .catch() to avoid blocking the response.
 */
export async function extractAndSaveMemories(
  memberId: string,
  userMessage: string,
  assistantReply: string,
): Promise<void> {
  try {
    // Fast regex extraction
    const regexMemories = extractRegexMemories(userMessage);

    // Claude extraction for deeper patterns
    const claudeMemories = await extractClaudeMemories(userMessage, assistantReply);

    // Merge and deduplicate
    const allMemories = [...regexMemories, ...claudeMemories];

    for (const mem of allMemories) {
      await prisma.memoryNode.upsert({
        where: { memberId_key: { memberId, key: mem.key } },
        create: {
          memberId,
          key: mem.key,
          category: mem.category,
          content: mem.content,
          confidence: 0.8,
          mentions: 1,
        },
        update: {
          content: mem.content,
          confidence: 1.0,
          mentions: { increment: 1 },
        },
      });
    }

    // Cap at MAX_MEMORIES per user
    const count = await prisma.memoryNode.count({ where: { memberId } });
    if (count > MAX_MEMORIES) {
      const oldest = await prisma.memoryNode.findMany({
        where: { memberId },
        orderBy: [{ confidence: "asc" }, { updatedAt: "asc" }],
        take: count - MAX_MEMORIES,
        select: { id: true },
      });
      await prisma.memoryNode.deleteMany({
        where: { id: { in: oldest.map((m) => m.id) } },
      });
    }
  } catch (e) {
    console.error("Memory extraction failed:", e);
  }
}

// ═══ REGEX EXTRACTION (fast path, from Co-Presenter) ═══

interface MemoryCandidate {
  key: string;
  category: string;
  content: string;
}

function extractRegexMemories(text: string): MemoryCandidate[] {
  const memories: MemoryCandidate[] = [];
  const lower = text.toLowerCase();

  // Name
  const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) {
    memories.push({ key: "name", category: "role", content: `User's name is ${nameMatch[1]}` });
  }

  // Department
  const deptMatch = text.match(/(?:i work in|i'm in|my department is|i'm from)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:department|team|group)/i);
  if (deptMatch) {
    memories.push({ key: "department", category: "role", content: `Works in ${deptMatch[1]}` });
  }

  // Title/Role
  const titleMatch = text.match(/(?:i'm a|i am a|my title is|my role is|i work as)\s+(.+?)(?:\.|,|$)/i);
  if (titleMatch) {
    memories.push({ key: "job_title", category: "role", content: `Job title: ${titleMatch[1].trim()}` });
  }

  // Preferences
  if (lower.includes("bullet point") || lower.includes("brief") || lower.includes("concise")) {
    memories.push({ key: "format_preference", category: "preferences", content: "Prefers concise, bulleted responses" });
  }
  if (lower.includes("detailed") || lower.includes("thorough") || lower.includes("in depth")) {
    memories.push({ key: "format_preference", category: "preferences", content: "Prefers detailed, thorough responses" });
  }

  return memories;
}

// ═══ CLAUDE EXTRACTION (deeper patterns, from Compass) ═══

async function extractClaudeMemories(
  userMessage: string,
  assistantReply: string,
): Promise<MemoryCandidate[]> {
  // Skip short or trivial messages
  if (userMessage.length < 20) return [];

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: HAIKU,
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Extract memorable facts about the user from this conversation exchange. Only extract facts that would be useful to remember in future conversations (name, role, department, preferences, projects they work on, people they mention).

User said: "${userMessage}"
Assistant replied: "${assistantReply.slice(0, 500)}"

Return a JSON array of objects with {key, category, content} where:
- key: short snake_case identifier (e.g., "works_on_project_x")
- category: one of "role", "preferences", "shortcuts", "relationships", "projects"
- content: the fact to remember (one sentence)

If nothing memorable, return an empty array []. Return ONLY valid JSON, nothing else.`,
      }],
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (m: any) => m.key && m.category && m.content && typeof m.content === "string",
      );
    }
  } catch {
    // Claude extraction is best-effort
  }

  return [];
}

/**
 * Encompass Intent Classifier — AI-Powered Tier Routing
 * Adapted from Compass classifier.ts
 *
 * Uses Haiku to classify user messages into tiers.
 * Fast (~200ms), cheap (~$0.0002/call).
 */

import Anthropic from "@anthropic-ai/sdk";

const HAIKU = "claude-haiku-4-5-20251001";

export interface ClassificationResult {
  tier: "quick" | "lookup" | "research" | "report" | "action";
  maxIterations: number;
  skipLoop: boolean;
}

const TIER_CONFIGS: Record<string, ClassificationResult> = {
  quick:    { tier: "quick",    maxIterations: 0, skipLoop: true },
  lookup:   { tier: "lookup",   maxIterations: 3, skipLoop: false },
  research: { tier: "research", maxIterations: 15, skipLoop: false },
  report:   { tier: "report",   maxIterations: 10, skipLoop: false },
  action:   { tier: "action",   maxIterations: 3, skipLoop: false },
};

const CLASSIFIER_PROMPT = `You classify user messages for an enterprise knowledge AI assistant called Encompass. Encompass has access to all company documents, policies, reports, and data through a knowledge engine.

Respond with EXACTLY ONE WORD — the tier name:

**quick** — Greetings, simple facts the AI can answer from memory or conversation context alone. No document lookup needed.
Examples: "Hello", "Thanks", "What's my name?", "Who am I?", "What did we talk about last time?"

**lookup** — Single-document retrieval. Policy questions, finding a specific document, simple factual answers from one source.
Examples: "What's the PTO policy?", "Find the employee handbook", "What are visiting hours?", "Show me the lease agreement template", "What's the move-in checklist?", "How many units do we have?"

**research** — Cross-document reasoning. Comparing multiple sources, synthesizing information, multi-step lookups, questions that span multiple documents or data sources.
Examples: "Compare Q3 and Q4 revenue", "What changed between the old and new PTO policy?", "Which prospects came from referrals vs website?", "Summarize all contracts expiring this year", "What are the top referral sources and their conversion rates?"

**report** — Generate a structured report, summary, or analysis. Anything that produces a formatted output document.
Examples: "Generate an occupancy report", "Build a pipeline summary", "Create a competitive analysis", "Summarize this month's activities", "Show me a breakdown by care type"

**action** — Execute an integration or trigger a workflow (future capability).
Examples: "Schedule a follow-up with Barbara", "Send an email to the discharge planner", "Create a task for Mary"

Respond with exactly one word: quick, lookup, research, report, or action.`;

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

export async function classifyIntent(userMessage: string): Promise<ClassificationResult> {
  if (!userMessage || userMessage.trim().length < 3) {
    return TIER_CONFIGS.quick;
  }

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: HAIKU,
      max_tokens: 10,
      system: CLASSIFIER_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const tier = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text.trim().toLowerCase())
      .join("")
      .replace(/[^a-z_]/g, "");

    if (tier in TIER_CONFIGS) {
      return TIER_CONFIGS[tier];
    }

    console.warn(`Encompass classifier: unexpected tier "${tier}", falling back to lookup`);
    return TIER_CONFIGS.lookup;
  } catch (err) {
    console.error("Encompass classifier error, falling back to lookup:", err);
    return TIER_CONFIGS.lookup;
  }
}

/**
 * Encompass — ReAct Agent Loop
 * Think -> Act -> Observe -> Repeat
 *
 * Adapted from Compass V3 loop.ts
 * Key design:
 * - Intent classifier routes to tier (quick/lookup/research/report)
 * - Side-channel HTML for reports (bypasses Claude output)
 * - Tool-leak stripping
 * - Strict message alternation
 * - Time-budget checks
 */

import Anthropic from "@anthropic-ai/sdk";
import { encompassTools } from "./tool-defs";
import { executeTool, ActionTaken } from "./tools";
import { classifyIntent } from "./classifier";

const SONNET = "claude-sonnet-4-6-20250514";

function stripToolLeaks(text: string): string {
  return text
    .replace(/<function_calls>[\s\S]*?<\/function_calls>/g, "")
    .replace(/<function_calls>[\s\S]*/g, "")
    .replace(/<function_response>[\s\S]*?<\/function_response>/g, "")
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .replace(/<tool_call>[\s\S]*/g, "")
    .replace(/<tool_response>[\s\S]*?<\/tool_response>/g, "")
    .replace(/<tool_response>[\s\S]*/g, "")
    .replace(/<invoke[\s\S]*?<\/invoke>/g, "")
    .replace(/<invoke[\s\S]*/g, "")
    .replace(/```json\s*\{[\s\S]*?\}\s*```/g, "")
    .replace(/\{"(tool|name)"\s*:[\s\S]*?\}\s*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface LoopOptions {
  maxIterations?: number;
  deadlineMs?: number;
}

export interface LoopResult {
  reply: string;
  html?: string;
  actionsTaken: ActionTaken[];
  iterations: number;
  toolCalls: number;
  tier: string;
  tokenCount: number;
}

interface ToolContext {
  orgId: string;
  memberId: string;
  memberRole: string;
  memberDept?: string;
}

export async function runEncompassLoop(
  messages: Anthropic.Messages.MessageParam[],
  systemPrompt: string,
  ctx: ToolContext,
  options: LoopOptions = {},
): Promise<LoopResult> {
  const deadlineMs = options.deadlineMs ?? 240000;
  let totalTokens = 0;

  // --- Intent classification ---
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUserMsg
    ? typeof lastUserMsg.content === "string"
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg.content)
        ? lastUserMsg.content
            .filter((b): b is Anthropic.Messages.TextBlockParam => b.type === "text")
            .map((b) => b.text)
            .join(" ")
        : ""
    : "";

  const classification = await classifyIntent(lastUserText);
  const maxIterations = options.maxIterations ?? classification.maxIterations ?? 7;

  // Quick tier: answer directly, skip loop
  if (classification.skipLoop && options.maxIterations === undefined) {
    const quickMsg = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 1500,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages,
    });

    const quickReply = quickMsg.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim() || "How can I help you today?";

    totalTokens = (quickMsg.usage?.input_tokens || 0) + (quickMsg.usage?.output_tokens || 0);

    return {
      reply: quickReply,
      actionsTaken: [],
      iterations: 0,
      toolCalls: 0,
      tier: classification.tier,
      tokenCount: totalTokens,
    };
  }

  const loopMaxTokens = 4096;
  const deadline = Date.now() + deadlineMs;
  const actionsTaken: ActionTaken[] = [];
  let currentMessages = [...messages];
  let finalReply = "";
  let capturedHtml: string | undefined;
  let totalToolCalls = 0;
  let iteration = 0;

  for (iteration = 0; iteration < maxIterations; iteration++) {
    // Time check
    if (Date.now() > deadline) {
      if (!finalReply) finalReply = buildTimeoutSummary(actionsTaken);
      break;
    }

    // THINK: Call Claude with tools
    const msg = await Promise.race([
      anthropic.messages.create({
        model: SONNET,
        max_tokens: loopMaxTokens,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: currentMessages,
        tools: encompassTools,
        tool_choice: { type: "auto" },
      }),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), Math.max(deadline - Date.now(), 1000)),
      ),
    ]);

    if (!msg) {
      if (!finalReply) finalReply = buildTimeoutSummary(actionsTaken);
      break;
    }

    totalTokens += (msg.usage?.input_tokens || 0) + (msg.usage?.output_tokens || 0);

    // Process response
    const textBlocks: string[] = [];
    const toolUseBlocks: Anthropic.Messages.ToolUseBlock[] = [];

    for (const block of msg.content) {
      if (block.type === "text") textBlocks.push(block.text);
      else if (block.type === "tool_use") toolUseBlocks.push(block);
    }

    if (textBlocks.length > 0) {
      finalReply = textBlocks.join("\n").trim();
    }

    // Detect leaked tool calls in text
    if (finalReply && toolUseBlocks.length === 0) {
      const hasLeakedTools = /<function_calls>|<invoke name=|<tool_call>/.test(finalReply) ||
        /```json\s*\{\s*"(tool|name)"\s*:/.test(finalReply);

      if (hasLeakedTools) {
        finalReply = stripToolLeaks(finalReply);
        currentMessages = [
          ...currentMessages,
          { role: "assistant" as const, content: msg.content },
          { role: "user" as const, content: [{ type: "text" as const, text: "You wrote tool calls as text instead of using your tools. Call the tool directly now." }] },
        ];
        continue;
      }
    }

    // Truncated response recovery
    if (msg.stop_reason === "max_tokens" && toolUseBlocks.length === 0) {
      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: msg.content },
        { role: "user" as const, content: [{ type: "text" as const, text: "Your response was cut off. Skip the preamble — call the tool directly." }] },
      ];
      continue;
    }

    // No tool calls = agent is done
    if (msg.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      break;
    }

    // ACT: Execute tool calls
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const toolBlock of toolUseBlocks) {
      totalToolCalls++;
      const { result, action } = await executeTool(toolBlock.name, toolBlock.input, ctx);
      actionsTaken.push(action);

      // Side-channel HTML capture
      let toolContent = result;
      try {
        const parsed = JSON.parse(result);
        if (parsed.html_ready && parsed.html) {
          capturedHtml = parsed.html;
          toolContent = JSON.stringify({
            success: true,
            html_ready: true,
            summary: parsed.summary || "Report generated successfully.",
            instruction: "The report HTML has been delivered to the user's screen. Tell them it's ready and they can print or save it.",
          });
        }
      } catch { /* pass through */ }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: toolContent,
      });
    }

    // OBSERVE: Add to conversation
    currentMessages = [
      ...currentMessages,
      { role: "assistant" as const, content: msg.content },
      { role: "user" as const, content: toolResults },
    ];

    // Time budget for next iteration (~12s needed)
    if (deadline - Date.now() < 12000) {
      if (!finalReply) {
        finalReply = actionsTaken
          .map((a) => a.summary)
          .join("; ") || "Processed your request but ran low on time.";
      }
      break;
    }
  }

  if (!finalReply) {
    finalReply = actionsTaken.length > 0
      ? "I processed your request. " + actionsTaken.map((a) => a.summary).join("; ") + "."
      : "I processed your request but couldn't find relevant information.";
  }

  return {
    reply: stripToolLeaks(finalReply),
    html: capturedHtml,
    actionsTaken,
    iterations: iteration + 1,
    toolCalls: totalToolCalls,
    tier: classification.tier,
    tokenCount: totalTokens,
  };
}

function buildTimeoutSummary(actions: ActionTaken[]): string {
  if (actions.length === 0) return "I ran out of time processing your request. Please try again.";
  return "I ran out of time but here's what I completed: " +
    actions.map((a) => a.summary).join("; ") + ". Try again for a complete response.";
}

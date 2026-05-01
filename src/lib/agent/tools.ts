/**
 * Encompass Tool Implementations
 * Each tool returns a JSON string result for the agent loop.
 * Adapted from Compass tools.ts pattern.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "../db";
import { queryKnowledge } from "../lightrag";

const BRAVE_API_KEY = process.env.BRAVE_API_KEY || "";

interface ToolContext {
  orgId: string;
  memberId: string;
  memberRole: string;
  memberDept?: string;
}

// ═══ TOOL: query_knowledge ═══

export async function toolQueryKnowledge(
  input: { query: string; mode?: string },
  ctx: ToolContext,
): Promise<string> {
  try {
    // Try LightRAG first, fall back to DB search
    let sections;
    try {
      const result = await queryKnowledge(ctx.orgId, input.query, (input.mode as any) || "hybrid");
      if (result.response && result.sources && result.sources.length > 0) {
        return JSON.stringify({
          success: true,
          response: result.response,
          sources: result.sources.slice(0, 10),
          source_count: result.sources.length,
        });
      }
    } catch {
      // LightRAG not available — fall back to DB full-text search
    }

    // DB fallback: search document sections by content match
    const keywords = input.query.toLowerCase().split(/\s+/).filter((w) => w.length > 2).slice(0, 5);

    sections = await prisma.documentSection.findMany({
      where: {
        document: { orgId: ctx.orgId, status: "indexed" },
        OR: keywords.map((kw) => ({
          content: { contains: kw, mode: "insensitive" as const },
        })),
      },
      include: {
        document: { select: { id: true, title: true, category: true, filename: true } },
      },
      take: 10,
      orderBy: { sectionIndex: "asc" },
    });

    if (sections.length === 0) {
      return JSON.stringify({
        success: true,
        response: "No relevant information found in the knowledge base for this query.",
        sources: [],
        source_count: 0,
      });
    }

    const sources = sections.map((s) => ({
      id: s.id,
      content: s.content.slice(0, 500),
      heading: s.heading,
      page_number: s.pageNumber,
      document_title: s.document.title,
      document_category: s.document.category,
      document_id: s.document.id,
    }));

    return JSON.stringify({
      success: true,
      response: `Found ${sources.length} relevant sections across ${new Set(sources.map((s) => s.document_title)).size} documents.`,
      sources,
      source_count: sources.length,
    });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: search_documents ═══

export async function toolSearchDocuments(
  input: { search?: string; category?: string; folder?: string },
  ctx: ToolContext,
): Promise<string> {
  try {
    const where: Record<string, unknown> = {
      orgId: ctx.orgId,
      status: "indexed",
    };
    if (input.category) where.category = input.category;
    if (input.folder) {
      const folder = await prisma.docFolder.findFirst({
        where: { orgId: ctx.orgId, name: { contains: input.folder, mode: "insensitive" } },
      });
      if (folder) where.folderId = folder.id;
    }

    let docs;
    if (input.search) {
      docs = await prisma.document.findMany({
        where: {
          ...where,
          OR: [
            { title: { contains: input.search, mode: "insensitive" } },
            { tags: { hasSome: [input.search.toLowerCase()] } },
          ],
        },
        select: { id: true, title: true, category: true, filename: true, pageCount: true, createdAt: true, tags: true },
        take: 20,
        orderBy: { updatedAt: "desc" },
      });
    } else {
      docs = await prisma.document.findMany({
        where,
        select: { id: true, title: true, category: true, filename: true, pageCount: true, createdAt: true, tags: true },
        take: 20,
        orderBy: { updatedAt: "desc" },
      });
    }

    return JSON.stringify({
      success: true,
      documents: docs,
      count: docs.length,
    });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: read_section ═══

export async function toolReadSection(
  input: { sectionId: string },
  ctx: ToolContext,
): Promise<string> {
  try {
    const section = await prisma.documentSection.findUnique({
      where: { id: input.sectionId },
      include: {
        document: {
          select: { id: true, title: true, orgId: true, category: true },
        },
      },
    });

    if (!section || section.document.orgId !== ctx.orgId) {
      return JSON.stringify({ success: false, error: "Section not found or access denied" });
    }

    return JSON.stringify({
      success: true,
      content: section.content,
      heading: section.heading,
      page_number: section.pageNumber,
      document_title: section.document.title,
      document_id: section.document.id,
    });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: cross_reference ═══

export async function toolCrossReference(
  input: { queries: string[]; objective: string },
  ctx: ToolContext,
): Promise<string> {
  try {
    const results = await Promise.all(
      input.queries.slice(0, 5).map((q) => queryKnowledge(ctx.orgId, q, "hybrid")),
    );

    const allSources = results.flatMap((r, i) => (r.sources || []).map((s) => ({
      ...s,
      query_index: i,
      query: input.queries[i],
    })));

    return JSON.stringify({
      success: true,
      objective: input.objective,
      query_results: results.map((r, i) => ({
        query: input.queries[i],
        response: r.response,
        source_count: (r.sources || []).length,
      })),
      all_sources: allSources.slice(0, 15),
    });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: generate_report ═══

export async function toolGenerateReport(
  input: { report_type: string; title: string; data_queries?: string[]; instructions?: string },
  ctx: ToolContext,
): Promise<string> {
  try {
    // Gather data from knowledge queries
    const dataResults = [];
    for (const query of (input.data_queries || [`${input.report_type} data`]).slice(0, 5)) {
      const result = await queryKnowledge(ctx.orgId, query, "hybrid");
      dataResults.push({ query, response: result.response });
    }

    // Build report HTML using Haiku
    const client = new Anthropic();
    const reportPrompt = `Generate a professional HTML report.

Title: ${input.title}
Type: ${input.report_type}
${input.instructions ? `Instructions: ${input.instructions}` : ""}

Data gathered:
${dataResults.map((d) => `Query: ${d.query}\nResult: ${d.response}`).join("\n\n")}

Generate a self-contained HTML document with inline styles. Use a professional color scheme (dark navy headers, white background, clean tables). Include:
- Title and date
- Executive summary
- Data tables where appropriate
- Key metrics highlighted
- Print-friendly layout

Return ONLY the HTML, no markdown wrapping.`;

    const reportMsg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: reportPrompt }],
    });

    const html = reportMsg.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return JSON.stringify({
      success: true,
      html_ready: true,
      html,
      summary: `Generated ${input.report_type} report: "${input.title}"`,
    });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: summarize_document ═══

export async function toolSummarizeDocument(
  input: { document_title: string; focus?: string },
  ctx: ToolContext,
): Promise<string> {
  try {
    const doc = await prisma.document.findFirst({
      where: {
        orgId: ctx.orgId,
        title: { contains: input.document_title, mode: "insensitive" },
        status: "indexed",
      },
      include: {
        sections: {
          orderBy: { sectionIndex: "asc" },
          select: { heading: true, content: true, pageNumber: true },
        },
      },
    });

    if (!doc) {
      return JSON.stringify({ success: false, error: `Document "${input.document_title}" not found` });
    }

    const fullText = doc.sections
      .map((s) => `${s.heading ? `## ${s.heading}\n` : ""}${s.content}`)
      .join("\n\n")
      .slice(0, 15000);

    const client = new Anthropic();

    const summaryMsg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Summarize this document${input.focus ? ` with a focus on: ${input.focus}` : ""}.\n\nDocument: ${doc.title}\n\n${fullText}`,
      }],
    });

    const summary = summaryMsg.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return JSON.stringify({
      success: true,
      document_title: doc.title,
      document_id: doc.id,
      page_count: doc.pageCount,
      section_count: doc.sections.length,
      summary,
    });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: search_web ═══

export async function toolSearchWeb(
  input: { query: string; count?: number },
): Promise<string> {
  if (!BRAVE_API_KEY) {
    return JSON.stringify({ success: false, error: "Web search is not enabled for this organization" });
  }

  try {
    const count = Math.min(input.count || 5, 10);
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input.query)}&count=${count}`,
      {
        headers: { "X-Subscription-Token": BRAVE_API_KEY, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      },
    );
    const data = await res.json();
    const results = (data.web?.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
    return JSON.stringify({ success: true, results, count: results.length });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: calculate ═══

export async function toolCalculate(
  input: { expression: string; label?: string },
): Promise<string> {
  try {
    // Safe math eval — only allow numbers and basic operators
    const sanitized = input.expression.replace(/[^0-9+\-*/().,%\s]/g, "");
    if (sanitized !== input.expression.replace(/\s/g, "")) {
      return JSON.stringify({ success: false, error: "Invalid characters in expression" });
    }
    const result = Function(`"use strict"; return (${sanitized})`)();
    return JSON.stringify({
      success: true,
      expression: input.expression,
      result: typeof result === "number" ? Math.round(result * 100) / 100 : result,
      label: input.label || "",
    });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: `Calculation failed: ${e.message}` });
  }
}

// ═══ TOOL: list_documents ═══

export async function toolListDocuments(
  input: { category?: string; folder?: string; limit?: number },
  ctx: ToolContext,
): Promise<string> {
  try {
    const where: Record<string, unknown> = { orgId: ctx.orgId, status: "indexed" };
    if (input.category) where.category = input.category;

    const docs = await prisma.document.findMany({
      where,
      select: { id: true, title: true, category: true, filename: true, pageCount: true, tags: true, createdAt: true },
      take: input.limit || 20,
      orderBy: { title: "asc" },
    });

    return JSON.stringify({
      success: true,
      documents: docs,
      count: docs.length,
    });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: check_access ═══

export async function toolCheckAccess(
  input: { documentId: string },
  ctx: ToolContext,
): Promise<string> {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: input.documentId },
      include: {
        folder: {
          select: { accessLevel: true, accessRoles: true, accessDepts: true },
        },
      },
    });

    if (!doc || doc.orgId !== ctx.orgId) {
      return JSON.stringify({ success: false, hasAccess: false, reason: "Document not found" });
    }

    // Check folder-level access
    if (doc.folder) {
      const { accessLevel, accessRoles, accessDepts } = doc.folder;
      if (accessLevel === "all") {
        return JSON.stringify({ success: true, hasAccess: true });
      }
      if (accessLevel === "role" && !accessRoles.includes(ctx.memberRole)) {
        return JSON.stringify({
          success: true,
          hasAccess: false,
          reason: `This document is restricted to roles: ${accessRoles.join(", ")}`,
          document_title: doc.title,
        });
      }
      if (accessLevel === "department" && ctx.memberDept && !accessDepts.includes(ctx.memberDept)) {
        return JSON.stringify({
          success: true,
          hasAccess: false,
          reason: `This document is restricted to departments: ${accessDepts.join(", ")}`,
          document_title: doc.title,
        });
      }
    }

    return JSON.stringify({ success: true, hasAccess: true, document_title: doc.title });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ═══ TOOL: query_structured_data ═══

export async function toolQueryStructuredData(
  input: {
    document_title: string;
    filters?: Array<{ field: string; operator: string; value: string }>;
    fields_to_return?: string[];
    aggregation?: string;
    group_by_field?: string;
    limit?: number;
  },
  ctx: ToolContext,
): Promise<string> {
  try {
    // Find the document
    const doc = await prisma.document.findFirst({
      where: {
        orgId: ctx.orgId,
        title: { contains: input.document_title, mode: "insensitive" },
        status: "indexed",
      },
      include: {
        sections: {
          orderBy: { sectionIndex: "asc" },
          select: { content: true, heading: true },
        },
      },
    });

    if (!doc) {
      return JSON.stringify({ success: false, error: `Document "${input.document_title}" not found` });
    }

    // Parse CSV content from sections
    const fullContent = doc.sections.map((s) => s.content).join("\n");
    const lines = fullContent.split("\n").filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      return JSON.stringify({ success: false, error: "Document doesn't contain structured tabular data" });
    }

    // Parse header and rows
    const headers = parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= headers.length * 0.5) { // Allow partial rows
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[j] || "";
        }
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      return JSON.stringify({ success: false, error: "Could not parse any data rows" });
    }

    // Apply filters
    let filtered = rows;
    if (input.filters && input.filters.length > 0) {
      for (const filter of input.filters) {
        const fieldName = findClosestField(filter.field, headers);
        if (!fieldName) continue;

        filtered = filtered.filter((row) => {
          const val = (row[fieldName] || "").toLowerCase();
          const target = filter.value.toLowerCase();
          switch (filter.operator) {
            case "equals": return val === target;
            case "contains": return val.includes(target);
            case "not_equals": return val !== target;
            default: return true;
          }
        });
      }
    }

    // Aggregation
    const aggregation = input.aggregation || "count";

    if (aggregation === "count") {
      return JSON.stringify({
        success: true,
        document_title: doc.title,
        total_rows: rows.length,
        matching_rows: filtered.length,
        available_fields: headers,
      });
    }

    if (aggregation === "group_by" && input.group_by_field) {
      const fieldName = findClosestField(input.group_by_field, headers);
      if (!fieldName) {
        return JSON.stringify({ success: false, error: `Field "${input.group_by_field}" not found. Available: ${headers.join(", ")}` });
      }
      const groups: Record<string, number> = {};
      for (const row of filtered) {
        const val = row[fieldName] || "(empty)";
        groups[val] = (groups[val] || 0) + 1;
      }
      // Sort by count descending
      const sorted = Object.entries(groups).sort(([, a], [, b]) => b - a);
      return JSON.stringify({
        success: true,
        document_title: doc.title,
        total_rows: rows.length,
        matching_rows: filtered.length,
        group_by: fieldName,
        groups: Object.fromEntries(sorted),
        group_count: sorted.length,
      });
    }

    if (aggregation === "list") {
      const limit = input.limit || 20;
      const fieldsToReturn = input.fields_to_return && input.fields_to_return.length > 0
        ? input.fields_to_return.map((f) => findClosestField(f, headers) || f)
        : headers.slice(0, 8); // Default to first 8 columns

      const results = filtered.slice(0, limit).map((row) => {
        const r: Record<string, string> = {};
        for (const f of fieldsToReturn) {
          if (row[f] !== undefined) r[f] = row[f];
        }
        return r;
      });

      return JSON.stringify({
        success: true,
        document_title: doc.title,
        total_rows: rows.length,
        matching_rows: filtered.length,
        showing: results.length,
        results,
        available_fields: headers,
      });
    }

    return JSON.stringify({ success: false, error: `Unknown aggregation: ${aggregation}` });
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function findClosestField(input: string, headers: string[]): string | null {
  const lower = input.toLowerCase();
  // Exact match
  const exact = headers.find((h) => h.toLowerCase() === lower);
  if (exact) return exact;
  // Contains match
  const contains = headers.find((h) => h.toLowerCase().includes(lower) || lower.includes(h.toLowerCase()));
  if (contains) return contains;
  return null;
}

// ═══ TOOL EXECUTOR ═══

export interface ActionTaken {
  tool: string;
  success: boolean;
  summary: string;
}

export interface ToolExecResult {
  result: string;
  action: ActionTaken;
}

export async function executeTool(
  toolName: string,
  input: unknown,
  ctx: ToolContext,
): Promise<ToolExecResult> {
  const args = input as Record<string, unknown>;
  let result: string;

  try {
    switch (toolName) {
      case "query_knowledge":
        result = await toolQueryKnowledge(args as any, ctx);
        break;
      case "search_documents":
        result = await toolSearchDocuments(args as any, ctx);
        break;
      case "read_section":
        result = await toolReadSection(args as any, ctx);
        break;
      case "cross_reference":
        result = await toolCrossReference(args as any, ctx);
        break;
      case "generate_report":
        result = await toolGenerateReport(args as any, ctx);
        break;
      case "summarize_document":
        result = await toolSummarizeDocument(args as any, ctx);
        break;
      case "search_web":
        result = await toolSearchWeb(args as any);
        break;
      case "calculate":
        result = await toolCalculate(args as any);
        break;
      case "list_documents":
        result = await toolListDocuments(args as any, ctx);
        break;
      case "query_structured_data":
        result = await toolQueryStructuredData(args as any, ctx);
        break;
      case "check_access":
        result = await toolCheckAccess(args as any, ctx);
        break;
      default:
        result = JSON.stringify({ success: false, error: `Unknown tool: ${toolName}` });
    }
  } catch (e: any) {
    result = JSON.stringify({ success: false, error: e.message });
  }

  let success = false;
  let summary = `Called ${toolName}`;
  try {
    const parsed = JSON.parse(result);
    success = parsed.success !== false;
    if (toolName === "query_knowledge" && success) summary = `Searched knowledge base: ${(args as any).query}`;
    else if (toolName === "search_documents" && success) summary = `Found ${parsed.count} documents`;
    else if (toolName === "generate_report" && success) summary = parsed.summary || "Generated report";
    else if (toolName === "summarize_document" && success) summary = `Summarized: ${parsed.document_title}`;
    else if (toolName === "search_web" && success) summary = `Web search: ${parsed.count} results`;
    else if (toolName === "calculate" && success) summary = `Calculated: ${parsed.result}`;
    else if (toolName === "list_documents" && success) summary = `Listed ${parsed.count} documents`;
    else if (toolName === "query_structured_data" && success) summary = `Queried ${parsed.document_title}: ${parsed.matching_rows} matching rows`;
    else if (toolName === "check_access") summary = parsed.hasAccess ? "Access granted" : `Access denied: ${parsed.reason}`;
    else if (!success) summary = `${toolName} failed: ${parsed.error}`;
  } catch { /* keep default summary */ }

  return { result, action: { tool: toolName, success, summary } };
}

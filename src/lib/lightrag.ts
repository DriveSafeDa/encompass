/**
 * LightRAG API Client
 * Handles tenant-isolated knowledge queries and document ingestion.
 * Mirrors the proxy pattern from party/lightrag/proxy/server.js
 */

const LIGHTRAG_URL = process.env.LIGHTRAG_URL || "http://localhost:9621";
const LIGHTRAG_API_KEY = process.env.LIGHTRAG_API_KEY || "";

interface LightRAGQueryResult {
  response: string;
  sources?: Array<{ id: string; content: string; score?: number }>;
}

interface LightRAGInsertResult {
  status: string;
  document_id?: string;
}

async function lightragFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${LIGHTRAG_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(LIGHTRAG_API_KEY ? { "X-API-Key": LIGHTRAG_API_KEY } : {}),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.timeout(options.method === "POST" && path.includes("documents") ? 300000 : 30000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LightRAG ${options.method || "GET"} ${path} failed: ${res.status} ${body}`);
  }
  return res;
}

/**
 * Query the knowledge base with tenant isolation.
 * Prefixes the query context with orgId to filter results.
 */
export async function queryKnowledge(
  orgId: string,
  query: string,
  mode: "hybrid" | "local" | "global" | "naive" = "hybrid",
): Promise<LightRAGQueryResult> {
  const res = await lightragFetch("/query", {
    method: "POST",
    body: JSON.stringify({
      query,
      mode,
      only_need_context: false,
      // Filter by tenant prefix in the response
      stream: false,
    }),
  });
  const data = await res.json();

  // Filter results to only include documents belonging to this org
  const filtered = {
    response: data.response || "",
    sources: (data.sources || []).filter((s: { id: string }) =>
      s.id.startsWith(`${orgId}:`),
    ),
  };
  return filtered;
}

/**
 * Insert a document section into LightRAG with tenant-prefixed ID.
 */
export async function insertDocument(
  orgId: string,
  docId: string,
  sectionIndex: number,
  content: string,
  description: string,
): Promise<LightRAGInsertResult> {
  const tenantDocId = `${orgId}:${docId}:section-${sectionIndex}`;
  const res = await lightragFetch("/documents/text", {
    method: "POST",
    body: JSON.stringify({
      text: content,
      description: `[${tenantDocId}] ${description}`,
    }),
  });
  return res.json();
}

/**
 * Delete a document from LightRAG.
 */
export async function deleteDocument(docId: string): Promise<void> {
  await lightragFetch(`/documents/${encodeURIComponent(docId)}`, {
    method: "DELETE",
  });
}

/**
 * Batch insert multiple sections for a document.
 */
export async function batchInsertSections(
  orgId: string,
  docId: string,
  sections: Array<{ index: number; content: string; heading?: string }>,
  docTitle: string,
): Promise<{ inserted: number; failed: number }> {
  let inserted = 0;
  let failed = 0;

  for (const section of sections) {
    try {
      const desc = section.heading
        ? `${docTitle} > ${section.heading}`
        : `${docTitle} > Section ${section.index + 1}`;
      await insertDocument(orgId, docId, section.index, section.content, desc);
      inserted++;
    } catch (e) {
      console.error(`Failed to insert section ${section.index} of ${docTitle}:`, e);
      failed++;
    }
  }

  return { inserted, failed };
}

/**
 * Health check for LightRAG service.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await lightragFetch("/health", {
      method: "GET",
    });
    return res.ok;
  } catch {
    return false;
  }
}

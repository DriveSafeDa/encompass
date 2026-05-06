/**
 * Public API: POST /api/v1/ingest
 * Ingest text content directly via API key (no file upload needed).
 * Used by n8n to push Compass research, briefings, and enrichment into Encompass.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-keys";
import { ingestFile } from "@/lib/ingestion/pipeline";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // 1. Validate API key with "ingest" permission
  const apiKey = req.headers.get("X-API-Key") || "";
  const keyCtx = await validateApiKey(apiKey);
  if (!keyCtx || !keyCtx.permissions.includes("ingest")) {
    return NextResponse.json({ error: "Invalid or unauthorized API key (needs 'ingest' permission)" }, { status: 401 });
  }

  // 2. Parse body
  const body = await req.json();
  const { title, text, category, tags } = body;

  if (!title || !text) {
    return NextResponse.json({ error: "title and text are required" }, { status: 400 });
  }

  if (text.length < 20) {
    return NextResponse.json({ error: "text too short (minimum 20 characters)" }, { status: 400 });
  }

  if (text.length > 500000) {
    return NextResponse.json({ error: "text too large (maximum 500K characters)" }, { status: 400 });
  }

  try {
    // 3. Convert text to a buffer and ingest through the existing pipeline
    //    This reuses all the existing logic: dedup, splitting, classification, LightRAG insertion
    const filename = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 80)}.md`;
    const buffer = Buffer.from(text, "utf-8");

    const result = await ingestFile(keyCtx.orgId, buffer, filename, "text/markdown", {
      title,
      tags: tags || [],
      uploadedBy: "api",
    });

    // 4. Audit log
    logAudit(keyCtx.orgId, "doc_ingest", {
      title,
      category: result.category || category || null,
      textLength: text.length,
      sections: result.sections,
      inserted: result.inserted,
      skipped: result.skipped,
      apiKeyPrefix: apiKey.slice(0, 12),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      title: result.title,
      sectionsCreated: result.sections,
      inserted: result.inserted,
      skipped: result.skipped || false,
      category: result.category || category || null,
    });
  } catch (err: any) {
    console.error("[API] Ingest error:", err.message);
    return NextResponse.json({ error: `Ingestion failed: ${err.message}` }, { status: 500 });
  }
}

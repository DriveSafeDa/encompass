/**
 * Document Ingestion API
 * POST /api/ingest — Upload and ingest documents
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, hasRole } from "@/lib/auth/helpers";
import { ingestFile } from "@/lib/ingestion/pipeline";
import { mimeFromFilename } from "@/lib/ingestion/extractors";
import { logAudit } from "@/lib/audit";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const authCtx = await getAuthContext();
  if (!authCtx || !hasRole(authCtx, "admin")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const folderId = formData.get("folderId") as string | null;
    const tagsRaw = formData.get("tags") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || mimeFromFilename(file.name);
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()) : [];

    const result = await ingestFile(authCtx.orgId, buffer, file.name, mimeType, {
      title: title || undefined,
      folderId: folderId || undefined,
      tags,
      uploadedBy: authCtx.clerkUserId,
    });

    logAudit(authCtx.orgId, "doc_upload", {
      doc_id: result.documentId,
      doc_title: result.title,
      action_detail: result.skipped
        ? "Skipped (already indexed)"
        : `Ingested ${result.sections} sections (${result.inserted} inserted, ${result.failed} failed)`,
    }, authCtx.clerkUserId).catch(() => {});

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

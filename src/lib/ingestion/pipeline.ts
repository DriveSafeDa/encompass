/**
 * Encompass Ingestion Pipeline
 * Orchestrates: File -> Extract -> Split -> Classify -> LightRAG Insert
 * Adapted from party/lightrag/ingestion/ingest.py
 */

import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "../db";
import { extractText } from "./extractors";
import { splitDocument } from "./splitter";
import { batchInsertSections } from "../lightrag";

const HAIKU = "claude-haiku-4-5-20251001";

interface IngestionResult {
  documentId: string;
  title: string;
  sections: number;
  inserted: number;
  failed: number;
  category: string | null;
  skipped: boolean;
}

/**
 * Ingest a single file into the knowledge base.
 */
export async function ingestFile(
  orgId: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  options: {
    title?: string;
    folderId?: string;
    tags?: string[];
    uploadedBy?: string;
  } = {},
): Promise<IngestionResult> {
  // 1. Hash for dedup
  const contentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  // Check if already ingested (hash-based dedup from ingest.py pattern)
  const existing = await prisma.document.findUnique({
    where: { orgId_contentHash: { orgId, contentHash } },
  });
  if (existing && existing.status === "indexed") {
    return {
      documentId: existing.id,
      title: existing.title,
      sections: 0,
      inserted: 0,
      failed: 0,
      category: existing.category,
      skipped: true,
    };
  }

  // 2. Create document record
  const title = options.title || filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  const doc = existing
    ? await prisma.document.update({
        where: { id: existing.id },
        data: { status: "processing", filename, mimeType, fileSize: fileBuffer.length, updatedAt: new Date() },
      })
    : await prisma.document.create({
        data: {
          orgId,
          title,
          filename,
          mimeType,
          fileSize: fileBuffer.length,
          r2Key: `${orgId}/${crypto.randomUUID()}/${filename}`,
          contentHash,
          status: "processing",
          folderId: options.folderId || null,
          tags: options.tags || [],
          uploadedBy: options.uploadedBy || null,
        },
      });

  try {
    // 3. Extract text
    const extraction = await extractText(fileBuffer, mimeType, filename);
    if (!extraction.text || extraction.text.trim().length < 10) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "failed", metadata: { error: "No extractable text" } as any },
      });
      return { documentId: doc.id, title, sections: 0, inserted: 0, failed: 0, category: null, skipped: false };
    }

    // 4. Auto-classify
    const category = await classifyDocument(title, extraction.text.slice(0, 500));

    // 5. Split into sections
    const sections = splitDocument(extraction.text, { pageCount: extraction.pageCount });

    // 6. Save sections to DB
    await prisma.documentSection.deleteMany({ where: { documentId: doc.id } });
    await prisma.documentSection.createMany({
      data: sections.map((s) => ({
        documentId: doc.id,
        sectionIndex: s.index,
        heading: s.heading,
        content: s.content,
        pageNumber: s.pageNumber,
      })),
    });

    // 7. Insert into LightRAG
    const lightragResult = await batchInsertSections(
      orgId,
      doc.id,
      sections.map((s) => ({ index: s.index, content: s.content, heading: s.heading || undefined })),
      title,
    );

    // 8. Update document status
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        status: "indexed",
        category,
        pageCount: extraction.pageCount || null,
        metadata: extraction.metadata as any || undefined,
        lastIndexedAt: new Date(),
      },
    });

    return {
      documentId: doc.id,
      title,
      sections: sections.length,
      inserted: lightragResult.inserted,
      failed: lightragResult.failed,
      category,
      skipped: false,
    };
  } catch (e: any) {
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "failed", metadata: { error: e.message } as any },
    });
    throw e;
  }
}

/**
 * Auto-classify a document using Haiku.
 */
async function classifyDocument(title: string, preview: string): Promise<string> {
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: HAIKU,
      max_tokens: 20,
      messages: [{
        role: "user",
        content: `Classify this document into exactly one category. Respond with ONLY the category name.

Title: ${title}
Preview: ${preview.slice(0, 300)}

Categories: policy, procedure, contract, report, meeting_notes, training, handbook, financial, legal, correspondence, data, marketing, technical

One word:`,
      }],
    });

    const category = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text.trim().toLowerCase())
      .join("")
      .replace(/[^a-z_]/g, "");

    const valid = ["policy", "procedure", "contract", "report", "meeting_notes", "training", "handbook", "financial", "legal", "correspondence", "data", "marketing", "technical"];
    return valid.includes(category) ? category : "data";
  } catch {
    return "data";
  }
}

/**
 * Ingest multiple files as a batch job.
 */
export async function ingestBatch(
  orgId: string,
  files: Array<{ buffer: Buffer; filename: string; mimeType: string }>,
  options: { folderId?: string; uploadedBy?: string } = {},
): Promise<{
  jobId: string;
  results: IngestionResult[];
  processed: number;
  failed: number;
  skipped: number;
}> {
  const job = await prisma.ingestionJob.create({
    data: {
      orgId,
      type: "upload",
      source: "manual",
      status: "processing",
      totalFiles: files.length,
      startedAt: new Date(),
    },
  });

  const results: IngestionResult[] = [];
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const result = await ingestFile(orgId, file.buffer, file.filename, file.mimeType, {
        folderId: options.folderId,
        uploadedBy: options.uploadedBy,
      });
      results.push(result);
      if (result.skipped) skipped++;
      else processed++;
    } catch (e: any) {
      failed++;
      console.error(`Failed to ingest ${file.filename}:`, e.message);
    }

    // Update job progress
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { processed, failed, skipped },
    });
  }

  await prisma.ingestionJob.update({
    where: { id: job.id },
    data: {
      status: failed === files.length ? "failed" : "completed",
      processed,
      failed,
      skipped,
      completedAt: new Date(),
    },
  });

  return { jobId: job.id, results, processed, failed, skipped };
}

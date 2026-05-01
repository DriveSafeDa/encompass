/**
 * Document Text Extractors
 * Handles PDF, DOCX, CSV/XLSX, and plain text extraction.
 */

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Extract text from a file buffer based on MIME type.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractionResult> {
  switch (mimeType) {
    case "application/pdf":
      return extractPdf(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/msword":
      return extractDocx(buffer);
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "text/csv":
      return extractSpreadsheet(buffer, mimeType);
    case "text/plain":
    case "text/markdown":
      return { text: buffer.toString("utf-8") };
    case "text/html":
      return extractHtml(buffer);
    default:
      // Try plain text as fallback
      return { text: buffer.toString("utf-8") };
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
    metadata: data.info ? { author: data.info.Author, title: data.info.Title } : undefined,
  };
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

async function extractSpreadsheet(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  const XLSX = await import("xlsx");

  let workbook;
  if (mimeType === "text/csv") {
    workbook = XLSX.read(buffer.toString("utf-8"), { type: "string" });
  } else {
    workbook = XLSX.read(buffer, { type: "buffer" });
  }

  const sheets: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`## Sheet: ${sheetName}\n${csv}`);
  }

  return { text: sheets.join("\n\n") };
}

async function extractHtml(buffer: Buffer): Promise<ExtractionResult> {
  const cheerio = await import("cheerio");
  const $ = cheerio.load(buffer.toString("utf-8"));

  // Remove script and style tags
  $("script, style, nav, footer, header").remove();

  // Extract text content
  const text = $("body").text()
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text };
}

/**
 * Detect MIME type from filename extension.
 */
export function mimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
    html: "text/html",
    htm: "text/html",
    json: "application/json",
  };
  return mimeMap[ext || ""] || "application/octet-stream";
}

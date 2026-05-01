/**
 * Document Section Splitter
 * Ported from party/lightrag/ingestion/splitter.py
 *
 * Splits documents into sections by:
 * - Heading hierarchy (H1/H2/H3 boundaries)
 * - Max chunk size (4000 chars with 200 char overlap)
 * - Page boundaries for PDFs
 */

export interface Section {
  index: number;
  heading: string | null;
  content: string;
  pageNumber: number | null;
}

const MAX_CHUNK_SIZE = 4000;
const OVERLAP = 200;

/**
 * Split text into sections by headings, then by size.
 */
export function splitDocument(
  text: string,
  options: { pageCount?: number } = {},
): Section[] {
  if (!text || text.trim().length === 0) return [];

  // First pass: split by markdown headings
  const headingSections = splitByHeadings(text);

  // Second pass: split oversized sections by chunk size
  const sections: Section[] = [];
  let index = 0;

  for (const hs of headingSections) {
    if (hs.content.length <= MAX_CHUNK_SIZE) {
      sections.push({
        index: index++,
        heading: hs.heading,
        content: hs.content.trim(),
        pageNumber: estimatePage(hs.content, text, options.pageCount),
      });
    } else {
      // Split large section into chunks with overlap
      const chunks = splitBySize(hs.content, MAX_CHUNK_SIZE, OVERLAP);
      for (let i = 0; i < chunks.length; i++) {
        sections.push({
          index: index++,
          heading: hs.heading ? `${hs.heading} (part ${i + 1})` : null,
          content: chunks[i].trim(),
          pageNumber: estimatePage(chunks[i], text, options.pageCount),
        });
      }
    }
  }

  return sections.filter((s) => s.content.length > 10);
}

interface HeadingSection {
  heading: string | null;
  content: string;
}

function splitByHeadings(text: string): HeadingSection[] {
  // Match markdown headings: # H1, ## H2, ### H3
  const headingPattern = /^(#{1,3})\s+(.+)$/gm;
  const sections: HeadingSection[] = [];
  let lastIndex = 0;
  let lastHeading: string | null = null;
  let match;

  while ((match = headingPattern.exec(text)) !== null) {
    // Content before this heading
    const content = text.slice(lastIndex, match.index).trim();
    if (content.length > 0) {
      sections.push({ heading: lastHeading, content });
    }
    lastHeading = match[2].trim();
    lastIndex = match.index + match[0].length;
  }

  // Remaining content after last heading
  const remaining = text.slice(lastIndex).trim();
  if (remaining.length > 0) {
    sections.push({ heading: lastHeading, content: remaining });
  }

  // If no headings found, return the whole text as one section
  if (sections.length === 0) {
    sections.push({ heading: null, content: text.trim() });
  }

  return sections;
}

function splitBySize(text: string, maxSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxSize;

    if (end < text.length) {
      // Try to break at a sentence or paragraph boundary
      const breakPoint = findBreakPoint(text, start + maxSize - 500, end);
      if (breakPoint > start) end = breakPoint;
    }

    chunks.push(text.slice(start, Math.min(end, text.length)));
    start = end - overlap;

    // Prevent infinite loop
    if (start >= text.length - overlap) {
      if (end < text.length) {
        chunks.push(text.slice(end - overlap));
      }
      break;
    }
  }

  return chunks;
}

function findBreakPoint(text: string, from: number, to: number): number {
  // Prefer paragraph breaks
  const paraBreak = text.lastIndexOf("\n\n", to);
  if (paraBreak > from) return paraBreak + 2;

  // Then sentence breaks
  const sentenceBreak = text.lastIndexOf(". ", to);
  if (sentenceBreak > from) return sentenceBreak + 2;

  // Then line breaks
  const lineBreak = text.lastIndexOf("\n", to);
  if (lineBreak > from) return lineBreak + 1;

  return to;
}

function estimatePage(
  chunk: string,
  fullText: string,
  pageCount?: number,
): number | null {
  if (!pageCount || pageCount <= 1) return null;
  const position = fullText.indexOf(chunk.slice(0, 100));
  if (position < 0) return null;
  const ratio = position / fullText.length;
  return Math.floor(ratio * pageCount) + 1;
}

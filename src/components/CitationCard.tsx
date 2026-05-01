"use client";

interface CitationProps {
  title: string;
  page?: number | null;
  snippet?: string;
  category?: string;
}

export default function CitationCard({ title, page, snippet, category }: CitationProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-accent-light)] border border-[var(--color-accent-soft)] text-xs cursor-default hover:bg-[var(--color-accent-soft)] transition-colors group">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)] flex-shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="font-medium text-[var(--color-accent)]">{title}</span>
      {page && <span className="text-[var(--color-accent)] opacity-60">p.{page}</span>}
      {category && (
        <span className="text-[10px] text-[var(--color-accent)] opacity-50 uppercase">{category}</span>
      )}
    </div>
  );
}

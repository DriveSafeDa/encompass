"use client";

interface CitationProps {
  title: string;
  page?: number | null;
  snippet?: string;
  category?: string;
}

export default function CitationCard({ title, page, snippet, category }: CitationProps) {
  return (
    <div className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs">
      <div className="flex-shrink-0 w-6 h-6 rounded bg-emerald-900/50 flex items-center justify-center text-emerald-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-200 truncate">{title}</span>
          {page && <span className="text-slate-500">p.{page}</span>}
          {category && (
            <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px]">
              {category}
            </span>
          )}
        </div>
        {snippet && (
          <p className="mt-1 text-slate-400 line-clamp-2">&ldquo;{snippet}&rdquo;</p>
        )}
      </div>
    </div>
  );
}

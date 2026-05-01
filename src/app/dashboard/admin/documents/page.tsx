"use client";

import { useEffect, useState, useCallback } from "react";

interface Doc {
  id: string;
  title: string;
  filename: string;
  category: string | null;
  status: string;
  pageCount: number | null;
  fileSize: number;
  createdAt: string;
  tags: string[];
}

interface DocDetail extends Doc {
  sections: Array<{
    id: string;
    sectionIndex: number;
    heading: string | null;
    content: string;
    pageNumber: number | null;
  }>;
  folder: { name: string } | null;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocDetail | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const loadDocs = useCallback(() => {
    fetch("/api/admin/documents")
      .then((r) => r.json())
      .then((data) => setDocs(data.documents || []))
      .catch(console.error);
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        await fetch("/api/ingest", { method: "POST", body: formData });
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
      }
    }
    setUploading(false);
    loadDocs();
  };

  const openDoc = async (docId: string) => {
    setLoadingDoc(true);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`);
      const data = await res.json();
      if (res.ok) setSelectedDoc(data);
    } catch (e) {
      console.error("Failed to load document:", e);
    }
    setLoadingDoc(false);
  };

  const filtered = docs.filter((d) =>
    !filter || d.title.toLowerCase().includes(filter.toLowerCase()) ||
    d.category?.toLowerCase().includes(filter.toLowerCase()),
  );

  // Document detail view
  if (selectedDoc) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">
          {/* Back + header */}
          <button
            onClick={() => setSelectedDoc(null)}
            className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] mb-6 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to documents
          </button>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{selectedDoc.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-[var(--color-text-muted)]">
                <span>{selectedDoc.filename}</span>
                {selectedDoc.pageCount && <span>{selectedDoc.pageCount} pages</span>}
                <span>{formatFileSize(selectedDoc.fileSize)}</span>
                <span>{selectedDoc.sections.length} sections</span>
                {selectedDoc.folder && <span>Folder: {selectedDoc.folder.name}</span>}
              </div>
            </div>
            {selectedDoc.category && (
              <span className="px-3 py-1 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] text-xs font-medium">
                {selectedDoc.category}
              </span>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {selectedDoc.sections.map((section) => (
              <div
                key={section.id}
                className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {section.heading && (
                      <h3 className="text-sm font-medium text-[var(--color-text)]">{section.heading}</h3>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Section {section.sectionIndex + 1}
                    </span>
                  </div>
                  {section.pageNumber && (
                    <span className="text-xs text-[var(--color-text-muted)]">p.{section.pageNumber}</span>
                  )}
                </div>
                <pre className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                  {section.content}
                </pre>
              </div>
            ))}

            {selectedDoc.sections.length === 0 && (
              <div className="text-center py-12 text-[var(--color-text-muted)]">
                No sections indexed for this document.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Document list view
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Documents</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{docs.length} documents in knowledge base</p>
          </div>
          <label className={`px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
            uploading
              ? "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
          }`}>
            {uploading ? "Uploading..." : "Upload Documents"}
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.csv,.txt,.md,.html"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <input
          type="text"
          placeholder="Filter by title or category..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full mb-4 px-4 py-2.5 rounded-xl bg-[var(--color-base)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]"
        />

        {loadingDoc && (
          <div className="text-center py-8 text-[var(--color-text-muted)]">Loading document...</div>
        )}

        <div className="space-y-2">
          {filtered.map((doc) => (
            <button
              key={doc.id}
              onClick={() => openDoc(doc.id)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:shadow-[0_2px_16px_rgba(37,99,235,0.06)] transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  doc.status === "indexed" ? "bg-emerald-500" :
                  doc.status === "processing" ? "bg-amber-500 animate-pulse" :
                  doc.status === "failed" ? "bg-red-500" : "bg-slate-400"
                }`} />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">{doc.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {doc.filename} {doc.pageCount ? `| ${doc.pageCount} pages` : ""} | {formatFileSize(doc.fileSize)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {doc.category && (
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-base)] text-[var(--color-text-muted)] text-xs border border-[var(--color-border-light)]">{doc.category}</span>
                )}
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              {docs.length === 0 ? "No documents yet. Upload some to get started." : "No matching documents."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

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

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");

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

  const filtered = docs.filter((d) =>
    !filter || d.title.toLowerCase().includes(filter.toLowerCase()) ||
    d.category?.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
            uploading
              ? "bg-slate-700 text-slate-400"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
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
          className="w-full mb-4 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-600"
        />

        <div className="space-y-2">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  doc.status === "indexed" ? "bg-emerald-500" :
                  doc.status === "processing" ? "bg-amber-500 animate-pulse" :
                  doc.status === "failed" ? "bg-red-500" : "bg-slate-600"
                }`} />
                <div>
                  <p className="text-sm text-slate-200 font-medium">{doc.title}</p>
                  <p className="text-xs text-slate-500">
                    {doc.filename} {doc.pageCount ? `| ${doc.pageCount} pages` : ""} | {formatFileSize(doc.fileSize)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {doc.category && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">{doc.category}</span>
                )}
                <span className="text-xs text-slate-500">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
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

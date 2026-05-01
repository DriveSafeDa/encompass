"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  action: string;
  clerkUserId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ page: page.toString(), limit: "50" });
    if (actionFilter) params.set("action", actionFilter);

    fetch(`/api/admin/audit?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch(console.error);
  }, [page, actionFilter]);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Audit Log</h1>

        <div className="flex items-center gap-4 mb-4">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm"
          >
            <option value="">All Actions</option>
            <option value="query">Queries</option>
            <option value="doc_upload">Doc Uploads</option>
            <option value="login">Logins</option>
            <option value="admin_action">Admin Actions</option>
            <option value="api_call">API Calls</option>
          </select>
          <span className="text-sm text-slate-500">{total} entries</span>
        </div>

        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.action === "query" ? "bg-emerald-900/50 text-emerald-400" :
                    log.action === "doc_upload" ? "bg-blue-900/50 text-blue-400" :
                    log.action === "api_call" ? "bg-purple-900/50 text-purple-400" :
                    "bg-slate-800 text-slate-400"
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-sm text-slate-300">
                    {(log.detail as any)?.query || (log.detail as any)?.doc_title || (log.detail as any)?.action_detail || "—"}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              {(log.detail as any)?.response_summary && (
                <p className="mt-2 text-xs text-slate-500 truncate">
                  Response: {(log.detail as any).response_summary}
                </p>
              )}
            </div>
          ))}
        </div>

        {total > 50 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-sm disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 50 >= total}
              className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-sm disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

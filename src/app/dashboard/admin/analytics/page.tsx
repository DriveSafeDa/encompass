"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalQueries: number;
  activeUsers: number;
  documentsIndexed: number;
  tokensUsed: number;
  tokenBudget: number;
  topCategories: Array<{ category: string; count: number }>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) return <div className="min-h-screen bg-slate-950 p-6 text-slate-400">Loading...</div>;

  const usagePercent = Math.round((stats.tokensUsed / stats.tokenBudget) * 100);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Analytics</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Total Queries" value={stats.totalQueries.toLocaleString()} />
          <MetricCard label="Active Users" value={stats.activeUsers.toString()} />
          <MetricCard label="Documents" value={stats.documentsIndexed.toString()} />
          <MetricCard label="Token Usage" value={`${usagePercent}%`} />
        </div>

        {/* Token Usage Bar */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 mb-8">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Monthly Token Budget</h2>
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {(stats.tokensUsed / 1000).toFixed(0)}K of {(stats.tokenBudget / 1000).toFixed(0)}K tokens used
          </p>
        </div>

        {/* Document Categories */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
          <h2 className="text-sm font-medium text-slate-400 mb-4">Documents by Category</h2>
          <div className="space-y-3">
            {stats.topCategories.map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <span className="text-sm text-slate-300 w-32">{c.category}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${(c.count / stats.documentsIndexed) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-slate-500 w-8 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

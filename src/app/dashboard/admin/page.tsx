"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalQueries: number;
  activeUsers: number;
  documentsIndexed: number;
  tokensUsed: number;
  tokenBudget: number;
  unanswered: number;
  topCategories: Array<{ category: string; count: number }>;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const navItems = [
    { href: "/dashboard/admin/documents", label: "Documents", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: "M18 20V10M12 20V4M6 20v-6" },
    { href: "/dashboard/admin/audit", label: "Audit Log", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { href: "/dashboard/admin/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Manage documents, users, and settings</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition"
          >
            Back to Chat
          </Link>
        </div>

        {/* Nav Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {navItems.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-700 transition group"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500 group-hover:text-emerald-400 transition mb-2">
                <path d={icon} />
              </svg>
              <span className="text-sm text-slate-300 group-hover:text-white transition">{label}</span>
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Total Queries" value={stats.totalQueries.toLocaleString()} />
            <StatCard label="Active Users" value={stats.activeUsers.toString()} />
            <StatCard label="Documents Indexed" value={stats.documentsIndexed.toString()} />
            <StatCard
              label="Token Usage"
              value={`${Math.round((stats.tokensUsed / stats.tokenBudget) * 100)}%`}
              sub={`${(stats.tokensUsed / 1000).toFixed(0)}K / ${(stats.tokenBudget / 1000).toFixed(0)}K`}
            />
            <StatCard label="Unanswered Questions" value={stats.unanswered.toString()} color="amber" />
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Top Categories</p>
              <div className="space-y-1">
                {stats.topCategories.slice(0, 4).map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{c.category}</span>
                    <span className="text-slate-300">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = "emerald" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color === "amber" ? "text-amber-400" : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

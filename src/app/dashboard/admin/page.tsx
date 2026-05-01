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

const adminNav = [
  { href: "/dashboard/admin/documents", label: "Documents", desc: "Upload and manage knowledge base", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" },
  { href: "/dashboard/admin/analytics", label: "Analytics", desc: "Query volume, usage, and trends", icon: "M18 20V10M12 20V4M6 20v-6" },
  { href: "/dashboard/admin/audit", label: "Audit Log", desc: "Immutable record of all activity", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { href: "/dashboard/admin/settings", label: "Settings", desc: "Organization and AI configuration", icon: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
];

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Admin</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage your knowledge base and monitor usage</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-sm text-[var(--color-text-secondary)] transition-colors"
          >
            Back to chat
          </Link>
        </div>

        {/* Nav cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {adminNav.map(({ href, label, desc, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-4 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:shadow-[0_2px_16px_rgba(37,99,235,0.06)] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-base)] border border-[var(--color-border-light)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-accent-light)] group-hover:border-[var(--color-accent-soft)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                  <path d={icon} />
                </svg>
              </div>
              <div>
                <div className="font-medium text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">{label}</div>
                <div className="text-sm text-[var(--color-text-muted)] mt-0.5">{desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats */}
        {stats && (
          <>
            <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Total Queries" value={stats.totalQueries.toLocaleString()} />
              <StatCard label="Active Users" value={stats.activeUsers.toString()} />
              <StatCard label="Documents Indexed" value={stats.documentsIndexed.toString()} />
              <StatCard
                label="Token Usage"
                value={`${Math.round((stats.tokensUsed / stats.tokenBudget) * 100)}%`}
                sub={`${(stats.tokensUsed / 1000).toFixed(0)}K / ${(stats.tokenBudget / 1000).toFixed(0)}K`}
              />
              <StatCard label="Unanswered" value={stats.unanswered.toString()} warn={stats.unanswered > 0} />
              <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="text-xs text-[var(--color-text-muted)] mb-3">Top Categories</div>
                <div className="space-y-2">
                  {stats.topCategories.slice(0, 4).map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-text-secondary)]">{c.category}</span>
                      <span className="font-medium text-[var(--color-text)]">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className={`text-2xl font-bold tracking-tight mt-1 ${warn ? "text-[var(--color-warning)]" : "text-[var(--color-text)]"}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</div>}
    </div>
  );
}

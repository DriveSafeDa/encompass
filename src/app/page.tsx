import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-sidebar)] flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-tight">E</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--color-text)]">Encompass</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-[var(--color-sidebar)] hover:bg-[var(--color-sidebar-hover)] text-white text-sm font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-8 py-20 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
              Enterprise Knowledge AI
            </div>
            <h1 className="text-[3.25rem] leading-[1.1] font-bold tracking-tight text-[var(--color-text)]">
              Ask your company anything.
              <span className="block text-[var(--color-text-secondary)] mt-1">
                Get answers with receipts.
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[var(--color-text-secondary)] max-w-lg">
              Encompass ingests your documents, policies, and data into an AI knowledge engine.
              Ask in text or voice. Every answer cites its source.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-colors"
              >
                Start asking
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] font-medium transition-colors"
              >
                See a demo
              </Link>
            </div>

            {/* Trust bar */}
            <div className="mt-12 flex items-center gap-8">
              {[
                { num: "273K", label: "activities tracked" },
                { num: "9.5K", label: "prospect records" },
                { num: "< 2s", label: "avg response" },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{num}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product preview */}
          <div className="relative">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border-light)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#fee2e2]" />
                  <div className="w-3 h-3 rounded-full bg-[#fef3c7]" />
                  <div className="w-3 h-3 rounded-full bg-[#d1fae5]" />
                </div>
                <div className="flex-1 text-center text-xs text-[var(--color-text-muted)]">encompass.wiki</div>
              </div>
              {/* Mock UI */}
              <div className="p-6 space-y-4">
                {/* Command bar mock */}
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-base)] border border-[var(--color-border)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)]">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span className="text-sm text-[var(--color-text-muted)]">What&apos;s our current occupancy rate?</span>
                </div>
                {/* Mock answer */}
                <div className="p-4 rounded-xl bg-[var(--color-base)] space-y-3">
                  <p className="text-sm text-[var(--color-text)] leading-relaxed">
                    Current occupancy at The Pointe at Deerfield is <span className="font-semibold">78.51%</span>,
                    up 3.95% from last month. Goal is 90%. You need 26.2 more move-ins to hit target.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-accent-light)] text-xs text-[var(--color-accent)]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      </svg>
                      Occupancy Report
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-accent-light)] text-xs text-[var(--color-accent)]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      </svg>
                      MI/MO Summary
                    </div>
                  </div>
                </div>
                {/* Mock KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Occupancy", value: "78.5%", trend: "+3.95%" },
                    { label: "Open Prospects", value: "157", trend: "-12" },
                    { label: "Past Due", value: "21", trend: "" },
                  ].map(({ label, value, trend }) => (
                    <div key={label} className="p-3 rounded-xl border border-[var(--color-border-light)]">
                      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
                      <div className="text-lg font-bold mt-0.5">{value}</div>
                      {trend && (
                        <div className={`text-xs mt-0.5 ${trend.startsWith('+') ? 'text-[var(--color-kpi-up)]' : 'text-[var(--color-kpi-down)]'}`}>
                          {trend}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Decorative gradient behind */}
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-blue-50 to-amber-50 opacity-60 blur-xl" />
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="w-full max-w-7xl mx-auto px-8 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Voice-First", desc: "Speak your question. Hear the answer. Hands-free knowledge access.", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2" },
            { title: "Source Citations", desc: "Every answer links to the document, page, and paragraph it came from.", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" },
            { title: "Audit Trail", desc: "Immutable log of every query, response, and action. Compliance-ready.", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
            { title: "Per-User Memory", desc: "Remembers your role, preferences, and context across conversations.", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
          ].map(({ title, desc, icon }) => (
            <div key={title} className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
                  <path d={icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-[var(--color-text)] mb-1.5">{title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-8 py-6 flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">Built by the Crew. Powered by Claude.</span>
        <span className="text-sm text-[var(--color-text-muted)]">&copy; 2026 Encompass</span>
      </footer>
    </div>
  );
}

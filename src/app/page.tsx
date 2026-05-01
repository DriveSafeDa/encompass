import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">Encompass</span>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
        >
          Open Dashboard
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white max-w-3xl leading-tight">
          Ask your company anything
          <span className="text-emerald-400"> — and it answers, with receipts.</span>
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl">
          Encompass ingests all your documents, policies, reports, and data into an AI knowledge engine.
          Ask questions in text or voice. Get answers with source citations and a full audit trail.
        </p>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
          {[
            { icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z", label: "Voice-First" },
            { icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", label: "Source Citations" },
            { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", label: "Audit Trail" },
            { icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", label: "Per-User Memory" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900 border border-slate-800"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
                <path d={icon} />
              </svg>
              <span className="text-sm text-slate-300">{label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="mt-10 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-lg transition"
        >
          Get Started
        </Link>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-slate-600 border-t border-slate-800">
        Built by the Crew. Powered by Claude.
      </footer>
    </div>
  );
}

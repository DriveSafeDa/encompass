"use client";

import { useEffect, useState } from "react";

interface OrgSettings {
  name: string;
  slug: string;
  personaFile: string | null;
  voiceConfig: { voiceId?: string; enabled?: boolean } | null;
  plan: string;
  tokenBudget: number;
  tokensUsed: number;
  billingEmail: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [persona, setPersona] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setPersona(data.personaFile || "");
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaFile: persona }),
      });
      if (res.ok) setMessage("Saved");
      else setMessage("Failed to save");
    } catch {
      setMessage("Error saving");
    }
    setSaving(false);
  };

  if (!settings) return <div className="min-h-screen bg-slate-950 p-6 text-slate-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Org Info */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-lg font-medium text-white mb-4">Organization</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Name</p>
                <p className="text-slate-200">{settings.name}</p>
              </div>
              <div>
                <p className="text-slate-500">Slug</p>
                <p className="text-slate-200">{settings.slug}</p>
              </div>
              <div>
                <p className="text-slate-500">Plan</p>
                <p className="text-slate-200 capitalize">{settings.plan}</p>
              </div>
              <div>
                <p className="text-slate-500">Token Budget</p>
                <p className="text-slate-200">
                  {(settings.tokensUsed / 1000).toFixed(0)}K / {(settings.tokenBudget / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          </div>

          {/* Persona */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-lg font-medium text-white mb-2">AI Persona</h2>
            <p className="text-sm text-slate-500 mb-4">
              Customize how the AI introduces itself and its personality. Write in Markdown.
            </p>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={12}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm p-4 font-mono focus:outline-none focus:border-emerald-600"
              placeholder={`# Compass\nYou are Compass, the AI knowledge assistant for Acme Corp.\nYou speak in a professional, warm tone.`}
            />
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Persona"}
              </button>
              {message && <span className="text-sm text-emerald-400">{message}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

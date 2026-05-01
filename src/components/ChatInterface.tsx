"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import CitationCard from "./CitationCard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  html?: string;
  citations?: Array<{
    title: string;
    page?: number;
    snippet?: string;
    category?: string;
  }>;
  actions?: Array<{ tool: string; success: boolean; summary: string }>;
  tier?: string;
}

const QUICK_ACTIONS = [
  { label: "Morning briefing", query: "Give me a morning briefing — occupancy, new inquiries, past-due activities, and anything that needs attention today.", icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" },
  { label: "Pipeline review", query: "Show me the full sales pipeline — prospects by stage, conversion rates, and how we're trending vs goal.", icon: "M3 3v18h18M7 16l4-4 4 4 6-6" },
  { label: "Who needs follow-up?", query: "Who has past-due activities? List them with the activity type, how overdue, and the assigned counselor.", icon: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
  { label: "Top referrers", query: "Who are our top referrers by move-in conversion? Show the organization, contact, and how many actual move-ins they've driven.", icon: "M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
];

const KPI_CARDS = [
  { label: "Occupancy", value: "78.5%", change: "+3.95%", direction: "up" as const },
  { label: "Open Prospects", value: "157", change: "-12 MTD", direction: "down" as const },
  { label: "Past Due", value: "21", change: "activities", direction: "neutral" as const },
  { label: "Conversion", value: "0.0%", change: "vs 50% goal", direction: "down" as const },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();

  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), sessionId, voice: voiceEnabled }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      const citations = parseCitations(data.reply);
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        html: data.html,
        citations,
        actions: data.actions,
        tier: data.tier,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (voiceEnabled && data.spoken) playTTS(data.spoken);
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Something went wrong: ${e.message}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId, voiceEnabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      const text = stopListening();
      if (text) sendMessage(text);
    } else {
      startListening();
    }
  };

  useEffect(() => {
    if (isListening && transcript) setInput(transcript);
  }, [isListening, transcript]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with command bar */}
      <div className={`flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] ${hasMessages ? 'px-6 py-3' : 'px-8 pt-10 pb-6'}`}>
        {!hasMessages && (
          <div className="max-w-3xl mx-auto mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
              Good {getTimeOfDay()}
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              Ask anything about your organization, or pick a quick action below.
            </p>
          </div>
        )}

        {/* Command bar */}
        <form onSubmit={handleSubmit} className={`${hasMessages ? 'max-w-4xl' : 'max-w-3xl'} mx-auto`}>
          <div className={`flex items-center gap-2 bg-[var(--color-base)] border border-[var(--color-border)] rounded-2xl px-4 ${hasMessages ? 'py-2' : 'py-3'} focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent-light)] transition-all`}>
            {/* Search icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)] flex-shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>

            {/* Input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 bg-transparent text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm resize-none focus:outline-none py-1"
            />

            {/* Voice input */}
            <button
              type="button"
              onClick={toggleVoice}
              className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isListening
                  ? "bg-red-100 text-red-600"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              }`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </button>

            {/* Voice output toggle */}
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                voiceEnabled
                  ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              }`}
              title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {voiceEnabled && <>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>}
              </svg>
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Content area: briefing OR conversation */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          /* ── BRIEFING VIEW ── */
          <div className="max-w-3xl mx-auto px-8 py-8 space-y-8 animate-fade-in">
            {/* Quick actions */}
            <div>
              <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Quick actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map(({ label, query, icon }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(query)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)] hover:shadow-[0_2px_12px_rgba(37,99,235,0.06)] text-left transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-base)] border border-[var(--color-border-light)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-accent-light)] group-hover:border-[var(--color-accent-soft)] transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                        <path d={icon} />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* KPI cards */}
            <div>
              <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Key metrics</h3>
              <div className="grid grid-cols-4 gap-3">
                {KPI_CARDS.map(({ label, value, change, direction }) => (
                  <div key={label} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div className="text-xs text-[var(--color-text-muted)] mb-2">{label}</div>
                    <div className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{value}</div>
                    <div className={`text-xs mt-1 ${
                      direction === "up" ? "text-[var(--color-kpi-up)]" :
                      direction === "down" ? "text-[var(--color-kpi-down)]" :
                      "text-[var(--color-text-muted)]"
                    }`}>
                      {change}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent hint */}
            <div className="text-center pt-4">
              <p className="text-xs text-[var(--color-text-muted)]">
                Type a question above or click a quick action to get started.
                <br />Every answer includes source citations you can verify.
              </p>
            </div>
          </div>
        ) : (
          /* ── CONVERSATION VIEW ── */
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-fade-in">
                {msg.role === "user" ? (
                  /* User message */
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Assistant message */
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-sidebar)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">E</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* HTML report */}
                      {msg.html && (
                        <div
                          className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-auto max-h-96 text-sm"
                          dangerouslySetInnerHTML={{ __html: msg.html }}
                        />
                      )}

                      {/* Text */}
                      <div className="text-sm leading-relaxed text-[var(--color-text)]">
                        {formatMessageContent(msg.content)}
                      </div>

                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((c, i) => (
                            <CitationCard key={i} {...c} />
                          ))}
                        </div>
                      )}

                      {/* Tool actions */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.actions.map((a, i) => (
                            <span
                              key={i}
                              className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                                a.success
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {a.tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-sidebar)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">E</span>
                </div>
                <div className="flex items-center gap-3 pt-1.5">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-subtle" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-subtle" style={{ animationDelay: "200ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-subtle" style={{ animationDelay: "400ms" }} />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">Searching knowledge base...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ HELPERS ═══

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function parseCitations(text: string): Array<{ title: string; page?: number; snippet?: string }> {
  const citations: Array<{ title: string; page?: number }> = [];
  const pattern = /\[Doc:\s*([^,\]]+)(?:,\s*p\.?(\d+))?\]/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const title = match[1].trim();
    const page = match[2] ? parseInt(match[2]) : undefined;
    if (!citations.find((c) => c.title === title && c.page === page)) {
      citations.push({ title, page });
    }
  }
  return citations;
}

function formatMessageContent(content: string): string {
  return content.replace(/\[Doc:\s*[^\]]+\]/g, "").replace(/\s{2,}/g, " ").trim();
}

async function playTTS(text: string) {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.headers.get("Content-Type")?.includes("audio")) {
      const audioBuffer = await res.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(audioBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = decoded;
      const gain = audioCtx.createGain();
      gain.gain.value = 0.9;
      source.connect(gain).connect(audioCtx.destination);
      source.start();
    } else {
      const data = await res.json();
      if (data.fallback === "browser" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(data.text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    }
  } catch (e) {
    console.error("TTS playback failed:", e);
  }
}

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

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();

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
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
          voice: voiceEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");

      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      // Parse citations from reply text [Doc: title, p.X]
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

      // Play TTS if voice enabled and spoken text available
      if (voiceEnabled && data.spoken) {
        playTTS(data.spoken);
      }
    } catch (e: any) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Something went wrong: ${e.message}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMsg]);
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

  // Update input with live transcript
  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript);
    }
  }, [isListening, transcript]);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/30 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">Ask anything about your organization</h2>
            <p className="text-slate-500 max-w-md">
              Search documents, policies, reports, and data. Get answers with source citations.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-md">
              {[
                "What is our occupancy rate?",
                "Show me the pipeline summary",
                "Who are our top referrers?",
                "List all prospect stages",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition border border-slate-800"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-emerald-700 text-white"
                  : "bg-slate-900 text-slate-200 border border-slate-800"
              }`}
            >
              {/* HTML report rendering */}
              {msg.html && (
                <div
                  className="mb-3 p-3 bg-white rounded-lg overflow-auto max-h-96"
                  dangerouslySetInnerHTML={{ __html: msg.html }}
                />
              )}

              {/* Message text */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {formatMessageContent(msg.content)}
              </div>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {msg.citations.map((c, i) => (
                    <CitationCard key={i} {...c} />
                  ))}
                </div>
              )}

              {/* Actions taken */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.actions.map((a, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        a.success ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {a.tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 rounded-2xl px-4 py-3 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                Searching knowledge base...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-4 bg-slate-950">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto">
          {/* Voice toggle */}
          <button
            type="button"
            onClick={toggleVoice}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
              isListening
                ? "bg-red-600 text-white animate-pulse"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your organization..."
              rows={1}
              className="w-full resize-none rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 px-4 py-3 pr-12 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Voice output toggle */}
          <button
            type="button"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
              voiceEnabled
                ? "bg-emerald-700 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
            title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {voiceEnabled && (
                <>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>
              )}
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══ HELPERS ═══

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
  // Strip citation tags from display (they're shown as CitationCards)
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
      // Fallback: browser speechSynthesis
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

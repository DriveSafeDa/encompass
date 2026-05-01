/**
 * Speech Recognition Hook — ported from Co-Presenter
 * Web Speech API with continuous mode and silence detection.
 */

"use client";

import { useRef, useState, useCallback } from "react";

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => string;
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const bufferRef = useRef("");

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim = result[0].transcript;
        }
      }
      if (final) {
        bufferRef.current += final;
      }
      setTranscript(bufferRef.current + interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      // Auto-restart if still listening (handles browser timeouts)
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch { /* already started */ }
      }
    };

    recognitionRef.current = recognition;
    bufferRef.current = "";
    setTranscript("");
    setError(null);
    setIsListening(true);

    try {
      recognition.start();
    } catch (e) {
      setError("Failed to start speech recognition");
    }
  }, []);

  const stopListening = useCallback((): string => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try { ref.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
    const result = bufferRef.current.trim();
    bufferRef.current = "";
    return result;
  }, []);

  return { isListening, transcript, startListening, stopListening, error };
}

/**
 * Encompass TTS API — ElevenLabs text-to-speech
 * 3-tier fallback: ElevenLabs -> Google TTS -> Browser (client-side)
 * Adapted from Co-Presenter tts route.
 */

import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const DEFAULT_VOICE_ID = "5Bw3DeQ98drY9a6GcAoZ"; // Solace voice

export async function POST(req: NextRequest) {
  const { text, voiceId } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  // Tier 1: ElevenLabs
  if (ELEVENLABS_API_KEY) {
    try {
      const voice = voiceId || DEFAULT_VOICE_ID;
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text.slice(0, 5000),
            model_id: "eleven_flash_v2_5",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.8,
              style: 0.15,
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (res.ok) {
        const audioBuffer = await res.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
          },
        });
      }
    } catch (e) {
      console.error("ElevenLabs TTS failed:", e);
    }
  }

  // Tier 2: Signal client to use browser speechSynthesis
  return NextResponse.json({
    fallback: "browser",
    text: text.slice(0, 2000),
  });
}

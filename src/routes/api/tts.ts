import { createFileRoute } from "@tanstack/react-router";
import { ttsModelsFor } from "@/lib/gemini-models.server";

/** OpenAI-style voice names → Gemini prebuilt voices of similar character. */
const GEMINI_VOICE: Record<string, string> = {
  alloy: "Kore",
  echo: "Charon",
  fable: "Puck",
  onyx: "Orus",
  nova: "Aoede",
  shimmer: "Leda",
  ash: "Fenrir",
  sage: "Zephyr",
  coral: "Leda",
  verse: "Puck",
};

type VoicePersona = {
  name?: string;
  role?: string;
  country?: string;
  region?: string;
  gender?: string;
  eraStart?: number | null;
  eraEnd?: number | null;
  signature?: string;
};

function personaDirection(persona: VoicePersona | undefined, text: string): string {
  const name = (persona?.name ?? "the selected historical persona").slice(0, 100);
  const role = (persona?.role ?? "historical thinker").slice(0, 160);
  const place = (persona?.country ?? persona?.region ?? "their cultural setting").slice(0, 100);
  const signature = (persona?.signature ?? "").slice(0, 240);
  const era = persona?.eraStart
    ? `${persona.eraStart}${persona.eraEnd ? `–${persona.eraEnd}` : ""}`
    : "their historical era";

  return [
    `Perform a respectful dramatic interpretation of ${name}, ${role}, from ${place} (${era}).`,
    "Use historically and culturally appropriate pronunciation, cadence, register, and emotional restraint.",
    persona?.gender ? `Use a ${persona.gender} vocal register.` : "",
    signature ? `Character and reasoning style: ${signature}` : "",
    "Do not claim this is an authentic recording or a biometric clone. Speak naturally, with measured pacing and clear diction.",
    "Read only the passage below; do not announce these directions.",
    "",
    text,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Wrap raw 16-bit PCM (Gemini returns 24 kHz mono) in a WAV container. */
function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const ascii = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          text?: string;
          voice?: string;
          userKey?: string;
          persona?: VoicePersona;
        };
        const text = (body.text ?? "").trim().slice(0, 3500);
        if (!text) return new Response("No text", { status: 400 });
        const directedText = personaDirection(body.persona, text);

        // A reader's own key: used once for this request, never stored or logged.
        const byo = (body.userKey ?? "").trim() || process.env.GEMINI_API_KEY;
        if (byo) {
          const voice = GEMINI_VOICE[body.voice ?? "alloy"] ?? "Kore";
          const speechBody = JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: directedText,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
            },
          });

          // Voice model ids change; ask the key which it can use.
          let models: string[] = [];
          try {
            models = (await ttsModelsFor(byo)).slice(0, 3);
          } catch {
            models = [];
          }

          for (const model of models) {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": byo },
                body: speechBody,
              },
            );
            if (!res.ok) continue;
            const data = (await res.json()) as {
              candidates?: Array<{
                content?: { parts?: Array<{ inlineData?: { data?: string } }> };
              }>;
            };
            const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
              ?.inlineData?.data;
            if (!b64) continue;
            const bin = atob(b64);
            const pcm = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
            const wav = pcmToWav(pcm);
            return new Response(wav.buffer as ArrayBuffer, {
              headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
            });
          }
          // Fall through to the shared allowance; the client also has a
          // device-voice fallback if that is exhausted too.
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Voice unavailable", { status: 503 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice: body.voice || "alloy",
            response_format: "mp3",
            instructions: personaDirection(body.persona, ""),
          }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          return new Response(detail || "Voice unavailable", { status: res.status });
        }

        return new Response(res.body, {
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
        });
      },
    },
  },
});

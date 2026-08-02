import { useEffect, useRef, useState } from "react";
import { withKey } from "@/lib/user-key";
import type { Persona } from "@/data/personas";
import { hasAuthenticVoice, voiceFor, voiceNote } from "@/lib/voices";

type State = "idle" | "loading" | "playing" | "error";

/** Pick a browser voice that roughly matches the persona, as a free fallback. */
function browserVoice(persona: Persona): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (!voices.length) return undefined;
  const wantFemale = persona.gender === "female";
  const scored = voices.filter((v) => v.lang.startsWith("en"));
  const pool = scored.length ? scored : voices;
  const gendered = pool.filter((v) =>
    wantFemale
      ? /female|samantha|victoria|karen|zira|serena|moira/i.test(v.name)
      : /male|daniel|alex|fred|george|david|rishi/i.test(v.name),
  );
  const list = gendered.length ? gendered : pool;
  let h = 0;
  for (let i = 0; i < persona.slug.length; i++) h = (h * 33 + persona.slug.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

/** Reader Mode: speaks a passage in a character-matched voice for the persona. */
export function ReaderButton({
  persona,
  text,
  compact,
}: {
  persona: Persona;
  text: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setState("idle");
  };

  const speakLocally = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setState("error");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 4000));
    const v = browserVoice(persona);
    if (v) u.voice = v;
    u.rate = 0.95;
    u.pitch = persona.gender === "female" ? 1.05 : 0.92;
    u.onend = () => setState("idle");
    u.onerror = () => setState("error");
    window.speechSynthesis.speak(u);
    setState("playing");
  };

  const play = async () => {
    if (state === "playing") return stop();
    setState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: voiceFor(persona),
          persona: {
            name: persona.name,
            role: persona.role,
            country: persona.country,
            region: persona.region,
            gender: persona.gender,
            eraStart: persona.eraStart,
            eraEnd: persona.eraEnd,
            signature: persona.signature,
          },
          ...withKey(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      audio.onerror = () => speakLocally();
      await audio.play();
      setState("playing");
    } catch {
      // Studio voice unavailable — fall back to the device's own synthesiser.
      speakLocally();
    }
  };

  const label =
    state === "loading"
      ? "summoning the voice…"
      : state === "playing"
        ? "stop reading"
        : state === "error"
          ? "voice unavailable"
          : "read aloud";

  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => void play()}
        title={voiceNote(persona)}
        className={`ink-transition font-mono text-[10.5px] ${
          state === "playing" ? "text-gold" : "text-muted-foreground hover:text-gold"
        }`}
      >
        {compact ? (state === "playing" ? "◼ stop" : "▶ read") : `▶ ${label}`}
      </button>
      {!hasAuthenticVoice(persona) && (
        <span title={voiceNote(persona)} className="cursor-help font-mono text-[11px] text-signal">
          *
        </span>
      )}
    </span>
  );
}

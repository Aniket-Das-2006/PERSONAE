import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArchiveHeader } from "@/components/ArchiveChrome";
import { PortraitAvatar } from "@/components/ParticlePortrait";
import { ReaderButton } from "@/components/ReaderButton";
import type { Persona } from "@/data/personas";
import { allPersonas, isCustom, uid } from "@/lib/archive-store";
import { debateTurn, judiciarySummary, translateText } from "@/lib/persona.functions";
import { plainLanguage, useLanguage } from "@/lib/language";
import { withKey } from "@/lib/user-key";
import { KeyPrompt } from "@/components/GeminiKeyPanel";

export const Route = createFileRoute("/debate")({
  head: () => ({
    meta: [
      { title: "Debate Chamber — PERSONAE" },
      {
        name: "description",
        content:
          "Put three historical minds in one room and let them argue a motion live until they reach a conclusion, then read the Judiciary's verdict.",
      },
      { property: "og:title", content: "Debate Chamber — PERSONAE" },
      {
        property: "og:description",
        content: "Three minds, one motion, a live argument and a written verdict.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DebatePage,
});

type Turn = {
  id: string;
  slug: string;
  name: string;
  content: string;
  addressing: string;
  stance: string;
};

type Verdict = {
  summary: string;
  agreed: string[];
  contested: string[];
  strongest: { name: string; why: string };
  ruling: string;
};

const MAX_TURNS = 12;

/** Instagram-style progressive typing of a finished message. */
function Typing({ text, onDone }: { text: string; onDone?: () => void }) {
  const [shown, setShown] = useState("");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setShown("");
    let i = 0;
    const step = Math.max(1, Math.round(text.length / 260));
    const id = window.setInterval(() => {
      i += step;
      if (i >= text.length) {
        setShown(text);
        window.clearInterval(id);
        doneRef.current?.();
      } else {
        setShown(text.slice(0, i));
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [text]);

  return <span className="whitespace-pre-wrap">{shown}</span>;
}

function TypingDots({ name }: { name: string }) {
  return (
    <p className="font-mono text-[11.5px] text-muted-foreground">
      {name} is typing
      <span className="animate-slow-pulse"> ● ● ●</span>
    </p>
  );
}

function DebatePage() {
  const [list, setList] = useState<Persona[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [live, setLive] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language] = useLanguage();
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const stopRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setList(allPersonas()), []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, speaking, verdict]);

  const chosen = useMemo(
    () => picked.map((s) => list.find((p) => p.slug === s)).filter(Boolean) as Persona[],
    [picked, list],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list.slice(0, 8);
    return list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.role.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)),
      )
      .slice(0, 8);
  }, [q, list]);

  const toggle = (slug: string) =>
    setPicked((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 3 ? prev : [...prev, slug],
    );

  const translateOne = async (t: Turn) => {
    setTranslated((prev) => ({ ...prev, [t.id]: "…" }));
    try {
      const res = await translateText({
        data: { ...withKey(), text: t.content, target: plainLanguage(language) },
      });
      setTranslated((prev) => ({ ...prev, [t.id]: res.content }));
    } catch (e) {
      setTranslated((prev) => ({
        ...prev,
        [t.id]: e instanceof Error ? e.message : "Translation failed.",
      }));
    }
  };

  const run = async () => {
    if (chosen.length !== 3 || !topic.trim() || running) return;
    setRunning(true);
    setError(null);
    setVerdict(null);
    setTurns([]);
    setTranslated({});
    stopRef.current = false;

    const transcript: Array<{ name: string; content: string }> = [];
    const collected: Turn[] = [];

    try {
      for (let i = 0; i < MAX_TURNS; i++) {
        if (stopRef.current) break;
        const speaker = chosen[i % 3];
        setSpeaking(speaker.name);
        const res = await debateTurn({
          data: {
            ...withKey(),
            language: plainLanguage(language),
            topic: topic.trim(),
            speaker: {
              slug: speaker.slug,
              name: speaker.name,
              role: speaker.role,
              systemPrompt: isCustom(speaker) ? speaker.systemPrompt : undefined,
            },
            others: chosen.filter((c) => c.slug !== speaker.slug).map((c) => c.name),
            round: Math.floor(i / 3) + 1,
            live,
            transcript: transcript.slice(-12),
          },
        });
        setSpeaking(null);
        if (!res.content) continue;
        const turn: Turn = {
          id: uid(),
          slug: speaker.slug,
          name: speaker.name,
          content: res.content,
          addressing: res.addressing,
          stance: res.stance,
        };
        collected.push(turn);
        transcript.push({ name: speaker.name, content: res.content });
        setTurns([...collected]);
        // let the typing animation breathe before the next speaker begins
        await new Promise((r) => setTimeout(r, Math.min(2600, 700 + res.content.length * 4)));
        if (res.concluded && i >= 5) break;
      }

      setSpeaking("The Judiciary");
      const v = await judiciarySummary({
        data: {
          ...withKey(),
          language: plainLanguage(language),
          topic: topic.trim(),
          transcript,
        },
      });
      setVerdict(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The chamber fell silent unexpectedly.");
    } finally {
      setSpeaking(null);
      setRunning(false);
    }
  };

  return (
    <div className="grain min-h-screen">
      <ArchiveHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">The Debate Chamber</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Seat three minds, table a motion, and let them argue in real time — each answering the
          others by name — until the argument settles. Then the Judiciary rules.
        </p>

        <div className="hairline mt-8 rounded p-5">
          <p className="smallcaps text-[11px] text-gold-dim">1 · Seat three minds</p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search the archive"
            className="hairline mt-3 w-full rounded bg-transparent px-3 py-2 font-mono text-[12px] text-parchment outline-none placeholder:text-muted-foreground/60"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {results.map((p) => (
              <button
                key={p.slug}
                onClick={() => toggle(p.slug)}
                className={`hairline ink-transition rounded-full px-3 py-1.5 font-mono text-[11px] ${
                  picked.includes(p.slug)
                    ? "bg-accent text-gold"
                    : "text-muted-foreground hover:text-gold"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {chosen.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {chosen.map((p) => (
                <span key={p.slug} className="flex items-center gap-2">
                  <PortraitAvatar name={p.name} size={28} />
                  <span className="font-display text-[13px] text-parchment">{p.name}</span>
                  <button
                    onClick={() => toggle(p.slug)}
                    className="font-mono text-[11px] text-muted-foreground hover:text-signal"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="smallcaps mt-6 text-[11px] text-gold-dim">2 · Table the motion</p>
          <textarea
            rows={2}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="This house believes that…"
            className="hairline mt-3 w-full resize-none rounded bg-transparent px-3 py-2 text-[14px] text-parchment outline-none placeholder:text-muted-foreground/60"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setLive((v) => !v)}
              className={`hairline rounded-full px-3 py-1.5 font-mono text-[10.5px] ${
                live ? "text-gold" : "text-muted-foreground"
              }`}
            >
              {live ? "● today's headlines in the room" : "○ headlines off"}
            </button>
            <button
              onClick={() => void run()}
              disabled={running || chosen.length !== 3 || !topic.trim()}
              className="ink-transition rounded bg-primary px-4 py-2 font-mono text-[11px] text-primary-foreground disabled:opacity-40"
            >
              {running ? "the chamber is in session…" : "open the debate"}
            </button>
            {running && (
              <button
                onClick={() => {
                  stopRef.current = true;
                }}
                className="font-mono text-[11px] text-muted-foreground hover:text-signal"
              >
                call for the verdict
              </button>
            )}
          </div>
          {chosen.length !== 3 && (
            <p className="mt-3 font-mono text-[10.5px] text-muted-foreground">
              Choose exactly three speakers ({chosen.length}/3).
            </p>
          )}
        </div>

        {error && (
          <div className="mt-6">
            <KeyPrompt message={error} />
          </div>
        )}

        <div className="mt-10 space-y-7">
          {turns.map((t, i) => {
            const persona = list.find((p) => p.slug === t.slug);
            return (
              <div key={t.id} className="flex gap-3 sm:gap-4">
                <PortraitAvatar name={t.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-[15px] text-parchment">{t.name}</span>
                    {t.addressing && (
                      <span className="font-mono text-[10px] text-gold-dim">→ {t.addressing}</span>
                    )}
                    {t.stance && (
                      <span className="hairline rounded-full px-2 py-0.5 font-mono text-[9.5px] text-signal">
                        {t.stance}
                      </span>
                    )}
                  </p>
                  <div className="mt-1.5 text-[14.5px] leading-[1.8] text-parchment/90">
                    {i === turns.length - 1 ? <Typing text={t.content} /> : t.content}
                  </div>
                  {translated[t.id] && (
                    <p className="hairline mt-2 rounded px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {translated[t.id]}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {persona && (
                      <ReaderButton
                        persona={persona}
                        text={translated[t.id] ?? t.content}
                        compact
                      />
                    )}
                    <button
                      onClick={() => void translateOne(t)}
                      className="font-mono text-[10.5px] text-muted-foreground hover:text-gold"
                    >
                      translate → {plainLanguage(language)}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {speaking && <TypingDots name={speaking} />}

          {verdict && (
            <div className="hairline animate-rise rounded bg-ink-raised/40 p-6">
              <p className="smallcaps text-[11px] text-gold">The Judiciary rules</p>
              <p className="mt-3 text-[14.5px] leading-[1.8] whitespace-pre-wrap text-parchment">
                {verdict.summary}
              </p>
              {verdict.agreed.length > 0 && (
                <div className="mt-5">
                  <p className="smallcaps text-[10.5px] text-gold-dim">Where they agreed</p>
                  <ul className="mt-2 space-y-1 text-[13.5px] text-muted-foreground">
                    {verdict.agreed.map((a, i) => (
                      <li key={i}>— {a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {verdict.contested.length > 0 && (
                <div className="mt-5">
                  <p className="smallcaps text-[10.5px] text-gold-dim">What stayed contested</p>
                  <ul className="mt-2 space-y-1 text-[13.5px] text-muted-foreground">
                    {verdict.contested.map((a, i) => (
                      <li key={i}>— {a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {verdict.strongest?.name && (
                <p className="mt-5 text-[13.5px] text-muted-foreground">
                  <span className="text-gold">Strongest case: </span>
                  {verdict.strongest.name} — {verdict.strongest.why}
                </p>
              )}
              {verdict.ruling && (
                <p className="hairline mt-5 rounded p-4 text-[14px] leading-relaxed text-parchment">
                  {verdict.ruling}
                </p>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArchiveHeader } from "@/components/ArchiveChrome";
import { AttachmentPicker, type UploadedFile } from "@/components/Attachments";
import { PortraitAvatar } from "@/components/ParticlePortrait";
import { ReaderButton } from "@/components/ReaderButton";
import type { Persona } from "@/data/personas";
import { addHighlight, allPersonas, isCustom, uid } from "@/lib/archive-store";
import { plainLanguage, useLanguage } from "@/lib/language";
import { askPersona, synthesizeCouncil } from "@/lib/persona.functions";
import { withKey } from "@/lib/user-key";
import { KeyPrompt } from "@/components/GeminiKeyPanel";

export const Route = createFileRoute("/council")({
  head: () => ({
    meta: [
      { title: "Council Mode — PERSONAE" },
      {
        name: "description",
        content:
          "Put one question to up to four historical minds at once and have their answers synthesised, contested or turned into a plan.",
      },
      { property: "og:title", content: "Council Mode — PERSONAE" },
      {
        property: "og:description",
        content: "Four minds, one question, one synthesis you can act on.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CouncilPage,
});

type Answer = { slug: string; name: string; content: string };

const MODES = [
  { id: "synthesis", label: "Synthesis", blurb: "Weave the voices into one reading." },
  { id: "verdict", label: "Verdict", blurb: "Force a single decision with reasons." },
  { id: "tensions", label: "Tensions", blurb: "Surface exactly where they disagree." },
  { id: "action", label: "Action plan", blurb: "Turn the counsel into concrete steps." },
] as const;

type Mode = (typeof MODES)[number]["id"];

function CouncilPage() {
  const [language] = useLanguage();
  const [list, setList] = useState<Persona[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [question, setQuestion] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [live, setLive] = useState(true);
  const [mode, setMode] = useState<Mode>("synthesis");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setList(allPersonas()), []);

  const chosen = useMemo(
    () => picked.map((s) => list.find((p) => p.slug === s)).filter(Boolean) as Persona[],
    [picked, list],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list.slice(0, 10);
    return list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.role.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)),
      )
      .slice(0, 10);
  }, [q, list]);

  const toggle = (slug: string) =>
    setPicked((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 4 ? prev : [...prev, slug],
    );

  const convene = async () => {
    if (chosen.length < 2 || !question.trim() || busy) return;
    setBusy(true);
    setError(null);
    setAnswers([]);
    setSynthesis("");
    setPending(chosen.map((c) => c.name));

    try {
      const settled = await Promise.all(
        chosen.map(async (p) => {
          const res = await askPersona({
            data: {
              ...withKey(),
              slug: p.slug,
              message: question.trim(),
              language: plainLanguage(language),
              live,
              attachments: files,
              custom: isCustom(p)
                ? { name: p.name, role: p.role, systemPrompt: p.systemPrompt }
                : undefined,
              history: [],
            },
          });
          setPending((prev) => prev.filter((n) => n !== p.name));
          const a: Answer = { slug: p.slug, name: p.name, content: res.content };
          setAnswers((prev) => [...prev, a]);
          return a;
        }),
      );

      const syn = await synthesizeCouncil({
        data: {
          ...withKey(),
          question: question.trim(),
          mode,
          answers: settled.map((a) => ({ name: a.name, content: a.content })),
        },
      });
      setSynthesis(syn.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The council could not be convened.");
    } finally {
      setPending([]);
      setBusy(false);
    }
  };

  return (
    <div className="grain min-h-screen">
      <ArchiveHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">Council Mode</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Convene between two and four minds on one question. Each answers alone; then the archive
          reads them together in the register you choose.
        </p>

        <div className="hairline mt-8 rounded p-5">
          <p className="smallcaps text-[11px] text-gold-dim">1 · Convene the council</p>
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

          <p className="smallcaps mt-6 text-[11px] text-gold-dim">2 · Put the question</p>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should I do about…"
            className="hairline mt-3 w-full resize-none rounded bg-transparent px-3 py-2 text-[14px] text-parchment outline-none placeholder:text-muted-foreground/60"
          />
          <div className="mt-3">
            <AttachmentPicker files={files} onChange={setFiles} disabled={busy} />
          </div>

          <p className="smallcaps mt-6 text-[11px] text-gold-dim">3 · Choose the reading</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                title={m.blurb}
                className={`hairline ink-transition rounded-full px-3 py-1.5 font-mono text-[11px] ${
                  mode === m.id ? "bg-accent text-gold" : "text-muted-foreground hover:text-gold"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10.5px] text-muted-foreground">
            {MODES.find((m) => m.id === mode)?.blurb}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setLive((v) => !v)}
              className={`hairline rounded-full px-3 py-1.5 font-mono text-[10.5px] ${
                live ? "text-gold" : "text-muted-foreground"
              }`}
            >
              {live ? "● today's headlines" : "○ headlines off"}
            </button>
            <button
              onClick={() => void convene()}
              disabled={busy || chosen.length < 2 || !question.trim()}
              className="ink-transition rounded bg-primary px-4 py-2 font-mono text-[11px] text-primary-foreground disabled:opacity-40"
            >
              {busy ? "the council is sitting…" : "convene"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6">
            <KeyPrompt message={error} />
          </div>
        )}

        {pending.length > 0 && (
          <p className="animate-slow-pulse mt-6 font-mono text-[11.5px] text-muted-foreground">
            waiting on {pending.join(", ")}…
          </p>
        )}

        {answers.length > 0 && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {answers.map((a) => {
              const persona = list.find((p) => p.slug === a.slug);
              return (
                <div key={a.slug} className="hairline rounded p-5">
                  <div className="flex items-center gap-3">
                    <PortraitAvatar name={a.name} size={32} />
                    <p className="font-display text-[16px] text-parchment">{a.name}</p>
                  </div>
                  <p className="mt-3 text-[14px] leading-[1.8] whitespace-pre-wrap text-parchment/90">
                    {a.content}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    {persona && <ReaderButton persona={persona} text={a.content} compact />}
                    <button
                      onClick={() =>
                        addHighlight({
                          id: uid(),
                          slug: a.slug,
                          personaName: a.name,
                          content: a.content,
                          createdAt: Date.now(),
                        })
                      }
                      className="font-mono text-[10px] text-muted-foreground hover:text-gold"
                    >
                      save to codex
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {synthesis && (
          <div className="hairline animate-rise mt-8 rounded bg-ink-raised/40 p-6">
            <p className="smallcaps text-[11px] text-gold">
              {MODES.find((m) => m.id === mode)?.label}
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.85] whitespace-pre-wrap text-parchment">
              {synthesis}
            </p>
            <button
              onClick={() =>
                addHighlight({
                  id: uid(),
                  slug: "council",
                  personaName: `Council — ${mode}`,
                  content: synthesis,
                  createdAt: Date.now(),
                })
              }
              className="mt-4 font-mono text-[10.5px] text-muted-foreground hover:text-gold"
            >
              save the reading to codex
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

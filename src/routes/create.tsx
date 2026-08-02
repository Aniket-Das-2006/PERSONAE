import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArchiveHeader, TagPill } from "@/components/ArchiveChrome";
import { ParticlePortrait } from "@/components/ParticlePortrait";
import { draftPersona } from "@/lib/persona.functions";
import { withKey } from "@/lib/user-key";
import {
  publishPersona,
  saveCustomPersona,
  slugify,
  type CustomPersona,
} from "@/lib/archive-store";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Compose a Persona — PERSONAE" },
      {
        name: "description",
        content:
          "Draft a new mind with attested traits, region and reasoning pattern, then publish it to the shared archive.",
      },
      { property: "og:title", content: "Compose a Persona — PERSONAE" },
      {
        property: "og:description",
        content: "Identify, review the dossier, and publish a mind everyone in the archive can consult.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

type Draft = {
  name: string;
  role: string;
  country: string;
  region: string;
  discipline: string;
  gender: string;
  voice: string;
  tags: string[];
  signature: string;
  eraStart: number | null;
  eraEnd: number | null;
  systemPrompt: string;
  confidence: number;
  sources: string[];
  caution: string;
};

function CreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const d = await draftPersona({ data: { ...withKey(), name: name.trim(), context: context || undefined } });
      setDraft({
        ...d,
        tags: (d.tags ?? []).slice(0, 6),
        sources: d.sources ?? [],
        confidence: typeof d.confidence === "number" ? d.confidence : 60,
      });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The draft could not be composed.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setError(null);
    const persona: CustomPersona = {
      slug: slugify(draft.name) || slugify(name),
      name: draft.name,
      role: draft.role,
      group: draft.country || draft.region || "Private Archive",
      country: draft.country,
      region: draft.region,
      discipline: draft.discipline,
      gender: draft.gender,
      voice: draft.voice,
      aliases: [],
      tags: draft.tags,
      signature: draft.signature,
      eraStart: draft.eraStart,
      eraEnd: draft.eraEnd,
      systemPrompt: draft.systemPrompt,
      custom: true,
    };
    saveCustomPersona(persona);
    try {
      await publishPersona(persona);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Saved privately, but publishing to the shared archive failed: ${e.message}`
          : "Saved privately, but publishing failed.",
      );
    }
    setBusy(false);
    setStep(3);
    window.setTimeout(() => navigate({ to: "/chat/$slug", params: { slug: persona.slug } }), 1500);
  };

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="block">
      <span className="smallcaps block text-[11px] text-gold-dim">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hairline mt-1.5 w-full rounded bg-transparent px-3 py-2 text-[13px] text-parchment outline-none"
      />
    </label>
  );

  return (
    <div className="grain min-h-screen">
      <ArchiveHeader />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
          {["Identify", "Review dossier", "Publish"].map((s, i) => (
            <span key={s} className={step === i + 1 ? "text-gold" : ""}>
              {i + 1}. {s}
              {i < 2 && <span className="mx-2 text-border">—</span>}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="animate-rise mt-10">
            <h1 className="font-display text-3xl text-parchment sm:text-4xl">Compose a mind</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Name a figure and, if you wish, supply the sources or context you want the dossier
              grounded in. The archive consults today's record, then drafts traits, region and
              country of origin, a documented reasoning pattern, a confidence rating and a caution.
              What you publish becomes available to everyone using the archive.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="name of the figure"
              className="hairline mt-8 w-full rounded bg-transparent px-4 py-3 font-display text-[18px] text-parchment outline-none placeholder:text-muted-foreground/60"
            />
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={6}
              placeholder="optional: which one you mean, biography, sources, quotations, the emphasis you want"
              className="hairline mt-3 w-full resize-none rounded bg-transparent px-4 py-3 text-[13.5px] leading-relaxed text-parchment outline-none placeholder:text-muted-foreground/60"
            />
            {error && <p className="mt-3 font-mono text-[11px] text-signal">{error}</p>}
            <button
              onClick={() => void generate()}
              disabled={busy || !name.trim()}
              className="mt-6 rounded bg-primary px-5 py-3 font-mono text-[11px] text-primary-foreground disabled:opacity-40"
            >
              {busy ? "consulting the record…" : "draft the dossier"}
            </button>
          </div>
        )}

        {step === 2 && draft && (
          <div className="animate-rise mt-10">
            <div className="flex flex-col items-center text-center">
              <ParticlePortrait name={draft.name} size={160} />
              <h1 className="font-display mt-5 text-3xl text-parchment">{draft.name}</h1>
              <p className="smallcaps mt-1 text-[12px] text-muted-foreground">{draft.role}</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {draft.country} · {draft.region} · {draft.discipline}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {draft.tags.map((t) => (
                  <TagPill key={t}>{t}</TagPill>
                ))}
              </div>
              <div className="hairline mt-4 w-full max-w-sm rounded p-3 text-left">
                <p className="font-mono text-[10.5px] text-muted-foreground">
                  attestation confidence
                </p>
                <div className="mt-1.5 h-1 w-full rounded bg-accent">
                  <div
                    className="h-1 rounded bg-gold"
                    style={{ width: `${Math.max(4, Math.min(100, draft.confidence))}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
                  {draft.confidence}% · rests on: {draft.sources.join("; ") || "general record"}
                </p>
                {draft.caution && (
                  <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-signal">
                    {draft.caution}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {field("Country or polity", draft.country, (v) => setDraft({ ...draft, country: v }))}
              {field("Region", draft.region, (v) => setDraft({ ...draft, region: v }))}
              {field("Discipline", draft.discipline, (v) => setDraft({ ...draft, discipline: v }))}
              {field("Voice", draft.voice, (v) => setDraft({ ...draft, voice: v }))}
            </div>

            <label className="smallcaps mt-8 block text-[11px] text-gold-dim">
              Reasoning signature
            </label>
            <textarea
              value={draft.signature}
              onChange={(e) => setDraft({ ...draft, signature: e.target.value })}
              rows={3}
              className="hairline mt-2 w-full resize-none rounded bg-transparent px-4 py-3 font-mono text-[12px] leading-relaxed text-parchment outline-none"
            />

            <label className="smallcaps mt-6 block text-[11px] text-gold-dim">System prompt</label>
            <textarea
              value={draft.systemPrompt}
              onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
              rows={14}
              className="hairline mt-2 w-full resize-none rounded bg-transparent px-4 py-3 text-[13px] leading-relaxed text-parchment outline-none"
            />

            {error && <p className="mt-3 font-mono text-[11px] text-signal">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => void save()}
                disabled={busy}
                className="rounded bg-primary px-5 py-3 font-mono text-[11px] text-primary-foreground disabled:opacity-40"
              >
                {busy ? "publishing…" : "publish to the shared archive"}
              </button>
              <button
                onClick={() => setStep(1)}
                className="hairline rounded px-5 py-3 font-mono text-[11px] text-muted-foreground"
              >
                revise the brief
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-rise mt-24 text-center">
            <h1 className="font-display text-3xl text-parchment">Added to the archive.</h1>
            <p className="mt-3 font-mono text-[12px] text-muted-foreground">
              everyone can now consult this mind — opening the consultation…
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

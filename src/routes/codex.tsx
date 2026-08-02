import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArchiveHeader } from "@/components/ArchiveChrome";
import { KeyPrompt } from "@/components/GeminiKeyPanel";
import { PortraitAvatar } from "@/components/ParticlePortrait";
import { ReaderButton } from "@/components/ReaderButton";
import { allPersonas } from "@/lib/archive-store";
import { getHighlights, removeHighlight, type Highlight } from "@/lib/archive-store";
import { distillCodex } from "@/lib/persona.functions";
import { withKey } from "@/lib/user-key";

export const Route = createFileRoute("/codex")({
  head: () => ({
    meta: [
      { title: "Codex — PERSONAE" },
      { name: "description", content: "Your saved exchanges, kept as a private reading journal." },
      { property: "og:title", content: "Codex — PERSONAE" },
      { property: "og:description", content: "Saved highlights from your consultations." },
    ],
  }),
  component: CodexPage,
});

type Distillation = {
  themes: Array<{ title: string; body: string; voices: string[] }>;
  tension: string;
  prompt: string;
};

function CodexPage() {
  const [items, setItems] = useState<Highlight[]>([]);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distilled, setDistilled] = useState<Distillation | null>(null);

  useEffect(() => setItems(getHighlights()), []);

  const personaList = useMemo(() => (typeof window === "undefined" ? [] : allPersonas()), [items]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (h) =>
        h.personaName.toLowerCase().includes(needle) ||
        h.content.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const distill = async () => {
    if (shown.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await distillCodex({
        data: {
          ...withKey(),
          question: focus.trim() || undefined,
          passages: shown
            .slice(0, 24)
            .map((h) => ({ personaName: h.personaName, content: h.content.slice(0, 3000) })),
        },
      });
      setDistilled(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The reading could not be distilled.");
    } finally {
      setBusy(false);
    }
  };

  const exportMd = () => {
    const md = shown
      .map(
        (h) =>
          `## ${h.personaName}\n_${new Date(h.createdAt).toLocaleString()}_\n\n${h.content}\n`,
      )
      .join("\n---\n\n");
    const head = distilled
      ? `## Distillation\n\n${distilled.themes
          .map((t) => `### ${t.title}\n${t.body}\n\n_voices: ${t.voices.join(", ")}_\n`)
          .join("\n")}\n**Tension.** ${distilled.tension}\n\n**Ask next.** ${distilled.prompt}\n\n---\n\n`
      : "";
    const blob = new Blob([`# Codex — PERSONAE\n\n${head}${md}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "personae-codex.md";
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="grain min-h-screen">
      <ArchiveHeader />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-4xl text-parchment">Codex</h1>
          {items.length > 0 && (
            <button
              onClick={exportMd}
              className="hairline rounded px-3 py-1.5 font-mono text-[11px] text-gold"
            >
              export reading
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Passages you kept. Held privately in this browser.
        </p>

        {items.length === 0 && (
          <p className="mt-24 text-center font-mono text-[12px] text-muted-foreground">
            Nothing kept yet. Hover a reply and choose “save to codex”.
          </p>
        )}

        {items.length > 0 && (
          <div className="hairline mt-8 rounded p-5">
            <p className="smallcaps text-[11px] text-gold-dim">Distil your reading</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              The archive reads what you kept and names the themes you are circling, the
              contradiction inside your own collection, and the question to put next.
            </p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="filter passages"
              className="hairline mt-3 w-full rounded bg-transparent px-3 py-2 font-mono text-[12px] text-parchment outline-none placeholder:text-muted-foreground/60"
            />
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="optional: what are you trying to decide?"
              className="hairline mt-2 w-full rounded bg-transparent px-3 py-2 text-[13.5px] text-parchment outline-none placeholder:text-muted-foreground/60"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void distill()}
                disabled={busy || shown.length === 0}
                className="ink-transition rounded bg-primary px-4 py-2 font-mono text-[11px] text-primary-foreground disabled:opacity-40"
              >
                {busy ? "reading…" : `distil ${shown.length} passage${shown.length === 1 ? "" : "s"}`}
              </button>
              {distilled && (
                <button
                  onClick={() => setDistilled(null)}
                  className="font-mono text-[10.5px] text-muted-foreground hover:text-signal"
                >
                  clear
                </button>
              )}
            </div>
            {error && (
              <div className="mt-3">
                <KeyPrompt message={error} />
              </div>
            )}
          </div>
        )}

        {distilled && (
          <div className="hairline animate-rise mt-6 rounded bg-ink-raised/40 p-6">
            <p className="smallcaps text-[11px] text-gold">What you are circling</p>
            <div className="mt-4 space-y-5">
              {distilled.themes.map((t, i) => (
                <div key={i}>
                  <p className="font-display text-[16px] text-parchment">{t.title}</p>
                  <p className="mt-1.5 text-[14px] leading-[1.8] text-parchment/90">{t.body}</p>
                  {t.voices.length > 0 && (
                    <p className="mt-1 font-mono text-[10px] text-gold-dim">
                      {t.voices.join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {distilled.tension && (
              <p className="hairline mt-5 rounded p-4 text-[13.5px] leading-relaxed text-muted-foreground">
                <span className="text-gold">Tension. </span>
                {distilled.tension}
              </p>
            )}
            {distilled.prompt && (
              <p className="mt-4 text-[14px] leading-relaxed text-parchment">
                <span className="text-gold">Ask next. </span>
                {distilled.prompt}
              </p>
            )}
          </div>
        )}

        <div className="mt-10 space-y-px overflow-hidden border border-border">
          {shown.map((h) => {
            const persona = personaList.find((p) => p.slug === h.slug);
            return (
              <div key={h.id} className="bg-ink-raised/50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <Link
                    to="/chat/$slug"
                    params={{ slug: h.slug }}
                    className="flex items-center gap-3"
                  >
                    <PortraitAvatar name={h.personaName} size={30} />
                    <span className="font-display text-[15px] text-parchment">
                      {h.personaName}
                    </span>
                  </Link>
                  <button
                    onClick={() => {
                      removeHighlight(h.id);
                      setItems(getHighlights());
                    }}
                    className="font-mono text-[10px] text-muted-foreground hover:text-signal"
                  >
                    remove
                  </button>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-[14px] leading-[1.8]">{h.content}</p>
                {persona && (
                  <div className="mt-3">
                    <ReaderButton persona={persona} text={h.content} compact />
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </main>
    </div>
  );
}

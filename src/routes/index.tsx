import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArchiveHeader } from "@/components/ArchiveChrome";
import { GeminiKeyPanel } from "@/components/GeminiKeyPanel";
import { openCommandPalette } from "@/components/CommandPalette";
import { ParticlePortrait } from "@/components/ParticlePortrait";
import { personas } from "@/data/personas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PERSONAE — The Living Archive" },
      {
        name: "description",
        content:
          "Consult 208 reconstructed minds. Press / to summon a historical thinker and reason alongside them.",
      },
      { property: "og:title", content: "PERSONAE — The Living Archive" },
      {
        property: "og:description",
        content: "A conversational archive of history's great minds. Press / to begin.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [featured, setFeatured] = useState(personas[0]);

  useEffect(() => {
    const pick = () => setFeatured(personas[Math.floor(Math.random() * personas.length)]);
    pick();
    const id = window.setInterval(pick, 9000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="grain min-h-screen">
      <ArchiveHeader />

      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-24 text-center">
        <p className="smallcaps text-[12px] text-gold-dim">The Living Archive · 208 minds</p>
        <h1 className="font-display mt-6 text-5xl leading-[1.05] tracking-tight text-parchment sm:text-7xl">
          Do not read about them.
          <br />
          Consult them.
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Each mind here is a reconstruction assembled from the documented record — their
          decision-making patterns, their reasoning habits, their refusals. Not a resurrection. A
          reading room.
        </p>

        <button
          onClick={openCommandPalette}
          className="hairline ink-transition animate-slow-pulse mt-10 rounded px-6 py-3 font-mono text-sm text-gold hover:bg-accent"
        >
          Press / to begin
        </button>

        <div className="mt-12 w-full max-w-xl">
          <GeminiKeyPanel />
        </div>


        <div className="mt-20 w-full border-t border-border pt-14">
          <p className="smallcaps text-[11px] text-gold-dim">In residence</p>
          <div className="mt-8 flex flex-col items-center">
            <ParticlePortrait key={featured.slug} name={featured.name} size={180} />
            <h2 className="font-display mt-5 text-2xl text-parchment">{featured.name}</h2>
            <p className="smallcaps mt-1 text-[12px] text-muted-foreground">{featured.role}</p>
            <p className="mt-4 max-w-2xl font-mono text-[12px] leading-relaxed text-muted-foreground">
              {featured.signature}
            </p>
            <Link
              to="/chat/$slug"
              params={{ slug: featured.slug }}
              className="hairline ink-transition mt-6 rounded px-4 py-2 text-[12px] text-gold hover:bg-accent"
            >
              Open conversation
            </Link>
          </div>
        </div>

        <div className="mt-24 grid w-full gap-px overflow-hidden border border-border text-left sm:grid-cols-3">
          {[
            {
              t: "Provenance, not disclaimers",
              d: "Every reply is annotated span by span: what the record documents, and what the archive infers.",
            },
            {
              t: "Council Mode",
              d: "Three minds, one question. Watch where they agree — and where they don't.",
            },
            {
              t: "Constellation",
              d: "The whole archive as a field of stars, drawn together by shared temperament.",
            },
          ].map((c) => (
            <div key={c.t} className="bg-ink-raised/60 p-6">
              <h3 className="font-display text-lg text-parchment">{c.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

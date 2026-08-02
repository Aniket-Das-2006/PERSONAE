import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArchiveHeader } from "@/components/ArchiveChrome";
import { PortraitAvatar } from "@/components/ParticlePortrait";
import type { Persona } from "@/data/personas";
import { allPersonas } from "@/lib/archive-store";
import { coords, LENSES, lensById } from "@/lib/axes";

export const Route = createFileRoute("/constellation")({
  head: () => ({
    meta: [
      { title: "Constellation — PERSONAE" },
      {
        name: "description",
        content:
          "Map every mind in the archive across five interpretive lenses — temperament, method, power, horizon and expression.",
      },
      { property: "og:title", content: "Constellation — PERSONAE" },
      {
        property: "og:description",
        content: "An explorable map of every mind in the archive, plotted on axes you can read.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConstellationPage,
});

function ConstellationPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<Persona[]>([]);
  const [lensId, setLensId] = useState(LENSES[0].id);
  const [group, setGroup] = useState("All");
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<Persona | null>(null);

  useEffect(() => setList(allPersonas()), []);

  const lens = lensById(lensId);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    list.forEach((p) => {
      const g = p.discipline ?? p.group ?? "Other";
      counts.set(g, (counts.get(g) ?? 0) + 1);
    });
    return [
      "All",
      ...Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([g]) => g),
    ];
  }, [list]);

  const points = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list
      .filter((p) => group === "All" || (p.discipline ?? p.group ?? "Other") === group)
      .map((p) => {
        const c = coords(p, lens);
        return {
          p,
          cx: 50 + c.x * 44,
          cy: 50 - c.y * 44,
          match: needle ? p.name.toLowerCase().includes(needle) : false,
        };
      });
  }, [list, group, lens, q]);

  return (
    <div className="grain min-h-screen">
      <ArchiveHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">Constellation</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every mind in the archive, plotted on two readable axes. Change the lens and the whole sky
          re-forms around a different question.
        </p>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {LENSES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLensId(l.id)}
              className={`hairline ink-transition rounded-full px-3 py-1.5 font-mono text-[11px] ${
                l.id === lensId ? "bg-accent text-gold" : "text-muted-foreground hover:text-gold"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11.5px] text-muted-foreground">{lens.blurb}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="hairline rounded bg-transparent px-2.5 py-1.5 font-mono text-[11px] text-gold outline-none"
          >
            {groups.map((g) => (
              <option key={g} value={g} className="bg-ink">
                {g}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="find a name in the sky"
            className="hairline w-56 rounded bg-transparent px-2.5 py-1.5 font-mono text-[11px] text-parchment outline-none placeholder:text-muted-foreground/60"
          />
          <span className="font-mono text-[11px] text-muted-foreground">
            {points.length} minds plotted
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="hairline relative rounded bg-ink-raised/30 p-3">
            <p className="smallcaps absolute top-1/2 -left-1 hidden -translate-y-1/2 -rotate-90 text-[10px] whitespace-nowrap text-gold-dim lg:block">
              ↑ {lens.y.high}
            </p>
            <svg viewBox="0 0 100 100" className="aspect-square w-full touch-none">
              <defs>
                <radialGradient id="glow">
                  <stop offset="0%" stopColor="oklch(0.76 0.106 84)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="oklch(0.76 0.106 84)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="url(#glow)" />
              {[10, 30, 50, 70, 90].map((v) => (
                <g key={v}>
                  <line
                    x1={v}
                    y1="4"
                    x2={v}
                    y2="96"
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="0.15"
                  />
                  <line
                    x1="4"
                    y1={v}
                    x2="96"
                    y2={v}
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="0.15"
                  />
                </g>
              ))}
              <line
                x1="4"
                y1="50"
                x2="96"
                y2="50"
                stroke="currentColor"
                className="text-gold/40"
                strokeWidth="0.3"
              />
              <line
                x1="50"
                y1="4"
                x2="50"
                y2="96"
                stroke="currentColor"
                className="text-gold/40"
                strokeWidth="0.3"
              />
              {points.map((pt) => (
                <g key={pt.p.slug}>
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={pt.match ? 2.2 : hover?.slug === pt.p.slug ? 1.9 : 1.1}
                    className={
                      pt.match
                        ? "fill-signal"
                        : hover?.slug === pt.p.slug
                          ? "fill-parchment"
                          : "fill-gold/70"
                    }
                    onMouseEnter={() => setHover(pt.p)}
                    onMouseLeave={() => setHover((h) => (h?.slug === pt.p.slug ? null : h))}
                    onClick={() => navigate({ to: "/chat/$slug", params: { slug: pt.p.slug } })}
                    style={{ cursor: "pointer" }}
                  />
                  {(pt.match || hover?.slug === pt.p.slug) && (
                    <text
                      x={pt.cx + 2.6}
                      y={pt.cy + 1}
                      className="fill-parchment"
                      style={{ fontSize: 2.4 }}
                    >
                      {pt.p.name}
                    </text>
                  )}
                </g>
              ))}
            </svg>
            <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-gold-dim">
              <span>← {lens.x.low}</span>
              <span>{lens.x.high} →</span>
            </div>
            <p className="mt-1 text-center font-mono text-[10px] text-gold-dim lg:hidden">
              ↑ {lens.y.high} · ↓ {lens.y.low}
            </p>
            <p className="hidden text-center font-mono text-[10px] text-gold-dim lg:block">
              ↓ {lens.y.low}
            </p>
          </div>

          <aside className="hairline rounded p-5">
            {hover ? (
              <>
                <div className="flex items-center gap-3">
                  <PortraitAvatar name={hover.name} size={38} />
                  <div className="min-w-0">
                    <p className="font-display truncate text-[17px] text-parchment">{hover.name}</p>
                    <p className="truncate font-mono text-[10.5px] text-muted-foreground">
                      {hover.role}
                    </p>
                  </div>
                </div>
                <p className="mt-3 font-mono text-[10.5px] text-gold-dim">
                  {[hover.country, hover.region].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  {hover.signature}
                </p>
                <button
                  onClick={() => navigate({ to: "/chat/$slug", params: { slug: hover.slug } })}
                  className="ink-transition mt-5 w-full rounded bg-primary px-3 py-2 font-mono text-[11px] text-primary-foreground"
                >
                  consult {hover.name.split(" ")[0]}
                </button>
              </>
            ) : (
              <p className="font-mono text-[11.5px] leading-relaxed text-muted-foreground">
                Hover or tap a star to read who it is. Click to open a consultation.
                <br />
                <br />
                Horizontal: {lens.x.low} ⟷ {lens.x.high}
                <br />
                <br />
                Vertical: {lens.y.low} ⟷ {lens.y.high}
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArchiveHeader, TagPill } from "@/components/ArchiveChrome";
import { PortraitAvatar } from "@/components/ParticlePortrait";
import type { Persona } from "@/data/personas";
import { allPersonas } from "@/lib/archive-store";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "The Archive — PERSONAE" },
      {
        name: "description",
        content: "Browse every mind in the archive by region, era and temperament.",
      },
      { property: "og:title", content: "The Archive — PERSONAE" },
      { property: "og:description", content: "Browse every reconstructed mind in the archive." },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const [list, setList] = useState<Persona[]>([]);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const [tag, setTag] = useState("All");

  useEffect(() => setList(allPersonas()), []);

  const groups = useMemo(
    () => ["All", ...Array.from(new Set(list.map((p) => p.group))).sort()],
    [list],
  );
  const tags = useMemo(
    () => ["All", ...Array.from(new Set(list.flatMap((p) => p.tags))).sort()],
    [list],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return list.filter(
      (p) =>
        (group === "All" || p.group === group) &&
        (tag === "All" || p.tags.includes(tag)) &&
        (!query ||
          p.name.toLowerCase().includes(query) ||
          p.role.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))),
    );
  }, [list, q, group, tag]);

  return (
    <div className="grain min-h-screen">
      <ArchiveHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-4xl text-parchment">The Archive</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {filtered.length} of {list.length} minds catalogued.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search the catalogue"
            className="hairline w-64 rounded bg-transparent px-3 py-2 font-mono text-[12px] text-parchment outline-none placeholder:text-muted-foreground/70"
          />
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="hairline rounded bg-ink-raised px-3 py-2 font-mono text-[12px] text-parchment outline-none"
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="hairline rounded bg-ink-raised px-3 py-2 font-mono text-[12px] text-parchment outline-none"
          >
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden border border-border sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.slug}
              to="/chat/$slug"
              params={{ slug: p.slug }}
              className="ink-transition group bg-ink-raised/50 p-5 hover:bg-accent"
            >
              <div className="flex items-start gap-3">
                <PortraitAvatar name={p.name} size={40} />
                <div className="min-w-0">
                  <h2 className="font-display truncate text-[17px] text-parchment">{p.name}</h2>
                  <p className="smallcaps mt-0.5 text-[11px] text-muted-foreground">{p.role}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
                {p.signature}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tags.slice(0, 3).map((t) => (
                  <TagPill key={t}>{t}</TagPill>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

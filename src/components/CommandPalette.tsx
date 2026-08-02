import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Persona } from "@/data/personas";
import { groupByRegion } from "@/data/personas";
import { allPersonas } from "@/lib/archive-store";
import { PersonaInvocation } from "./PersonaInvocation";

function search(list: Persona[], q: string, limit = 60) {
  const query = q.trim().toLowerCase();
  if (!query) return list.slice(0, limit);
  const scored: Array<{ p: Persona; s: number }> = [];
  for (const p of list) {
    const name = p.name.toLowerCase();
    let s = -1;
    if (name.startsWith(query)) s = 0;
    else if (p.slug.startsWith(query) || p.aliases.some((a) => a.startsWith(query))) s = 1;
    else if (name.includes(query)) s = 2;
    else if (p.group.toLowerCase().includes(query)) s = 3;
    else if (p.tags.some((t) => t.toLowerCase().includes(query))) s = 4;
    else if (p.role.toLowerCase().includes(query)) s = 5;
    if (s >= 0) scored.push({ p, s });
  }
  scored.sort((a, b) => a.s - b.s || a.p.name.localeCompare(b.p.name));
  return scored.slice(0, limit).map((x) => x.p);
}

const COMMANDS = [
  { cmd: "list", label: "Browse the full archive", to: "/archive" },
  { cmd: "council", label: "Convene several minds", to: "/council" },
  { cmd: "constellation", label: "Open the constellation", to: "/constellation" },
  { cmd: "create", label: "Compose a new persona", to: "/create" },
  { cmd: "codex", label: "Open your codex", to: "/codex" },
  { cmd: "exit", label: "Return to the neutral archive", to: "/" },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [invoking, setInvoking] = useState<Persona | null>(null);
  const [library, setLibrary] = useState<Persona[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLibrary(allPersonas());
  }, [open]);

  const results = useMemo(() => search(library, query), [library, query]);
  const commandMatches = useMemo(
    () => (query ? COMMANDS.filter((c) => c.cmd.startsWith(query.trim().toLowerCase())) : COMMANDS),
    [query],
  );
  const flat = useMemo(() => results, [results]);

  const openPalette = useCallback(() => {
    setQuery("");
    setIndex(0);
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true);
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openPalette]);

  useEffect(() => {
    const handler = () => openPalette();
    window.addEventListener("personae:open-palette", handler);
    return () => window.removeEventListener("personae:open-palette", handler);
  }, [openPalette]);

  const choose = (p: Persona) => {
    setOpen(false);
    setInvoking(p);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = commandMatches.find((c) => c.cmd === query.trim().toLowerCase());
      if (cmd) {
        setOpen(false);
        navigate({ to: cmd.to });
        return;
      }
      const p = flat[index];
      if (p) choose(p);
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/80 px-4 pt-[12vh] backdrop-blur-[3px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-rise grain hairline w-full max-w-2xl overflow-hidden rounded-md bg-popover shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <span className="font-mono text-sm text-gold">/</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={onInputKey}
                placeholder="summon a mind — name, region, tradition or trait"
                className="w-full bg-transparent font-mono text-sm text-parchment outline-none placeholder:text-muted-foreground/70"
              />
              <span className="smallcaps hidden text-[11px] text-muted-foreground sm:block">
                esc to dismiss
              </span>
            </div>

            <div className="max-h-[52vh] overflow-y-auto">
              {query && commandMatches.length > 0 && (
                <div className="px-4 py-3">
                  <p className="smallcaps mb-2 text-[11px] text-gold-dim">Commands</p>
                  {commandMatches.map((c) => (
                    <button
                      key={c.cmd}
                      onClick={() => {
                        setOpen(false);
                        navigate({ to: c.to });
                      }}
                      className="ink-transition flex w-full items-baseline gap-3 rounded px-2 py-1.5 text-left hover:bg-accent"
                    >
                      <span className="font-mono text-xs text-gold">/{c.cmd}</span>
                      <span className="text-xs text-muted-foreground">{c.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {groupByRegion(results).map(([region, list]) => (
                <div key={region} className="px-4 pb-2">
                  <p className="smallcaps sticky top-0 bg-popover py-2 text-[11px] text-gold-dim">
                    {region}
                  </p>
                  {list.map((p) => {
                    const active = flat[index]?.slug === p.slug;
                    return (
                      <button
                        key={p.slug}
                        onMouseEnter={() => setIndex(flat.findIndex((x) => x.slug === p.slug))}
                        onClick={() => choose(p)}
                        className={`ink-transition flex w-full items-center justify-between gap-4 rounded px-2 py-2 text-left ${
                          active ? "bg-accent" : ""
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="font-display block truncate text-[15px] text-parchment">
                            {p.name}
                          </span>
                          <span className="smallcaps block truncate text-[11px] text-muted-foreground">
                            {p.role}
                          </span>
                        </span>
                        <span className="hidden shrink-0 gap-1.5 sm:flex">
                          {p.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="hairline rounded-full px-2 py-0.5 text-[10px] text-gold"
                            >
                              {t}
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {results.length === 0 && (
                <p className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
                  No mind in the archive answers to that name.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {invoking && (
        <div className="grain fixed inset-0 z-[60] flex items-center justify-center bg-ink">
          <PersonaInvocation
            persona={invoking}
            onComplete={() => {
              const p = invoking;
              setInvoking(null);
              navigate({ to: "/chat/$slug", params: { slug: p.slug } });
            }}
          />
        </div>
      )}
    </>
  );
}

export function openCommandPalette() {
  window.dispatchEvent(new Event("personae:open-palette"));
}

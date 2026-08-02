import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { openCommandPalette } from "./CommandPalette";
import { TranslateWidget } from "./TranslateWidget";

const NAV = [
  { to: "/archive", label: "Archive" },
  { to: "/constellation", label: "Constellation" },
  { to: "/council", label: "Council" },
  { to: "/debate", label: "Debate" },
  { to: "/create", label: "Compose" },
  { to: "/codex", label: "Codex" },
];

export function ArchiveHeader({ right }: { right?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-ink/85 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-5">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="ink-transition -ml-1 flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded text-gold hover:bg-accent md:hidden"
          >
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
          </button>
          <Link to="/" className="font-display text-[17px] tracking-[0.18em] text-parchment">
            PERSONAE
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="smallcaps ink-transition text-[12px] text-muted-foreground hover:text-gold"
                activeProps={{ className: "text-gold" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {right}
            <button
              onClick={openCommandPalette}
              className="hairline ink-transition rounded px-3 py-1.5 font-mono text-[11px] text-gold hover:bg-accent"
            >
              <span className="hidden sm:inline">press / to summon</span>
              <span className="sm:hidden">/</span>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
          />
          <div className="animate-rise absolute inset-y-0 left-0 w-72 border-r border-border bg-ink p-5">
            <p className="font-display text-[17px] tracking-[0.18em] text-parchment">PERSONAE</p>
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="smallcaps ink-transition rounded px-3 py-3 text-[13px] text-muted-foreground hover:bg-accent hover:text-gold"
                  activeProps={{ className: "text-gold" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => {
                setOpen(false);
                openCommandPalette();
              }}
              className="hairline mt-6 w-full rounded px-3 py-3 font-mono text-[11px] text-gold"
            >
              summon a mind
            </button>
          </div>
        </div>
      )}

      <TranslateWidget />
    </>
  );
}

export function TagPill({ children }: { children: ReactNode }) {
  return (
    <span className="hairline rounded-full px-2.5 py-0.5 text-[10.5px] tracking-wide text-gold">
      {children}
    </span>
  );
}

import { useEffect, useRef, useState } from "react";
import { LANGUAGES, useLanguage } from "@/lib/language";

/** Chrome-extension style floating language switch. */
export function TranslateWidget() {
  const [lang, setLang] = useLanguage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const list = LANGUAGES.filter((l) => l.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-50 print:hidden">
      {open && (
        <div className="hairline animate-rise mb-2 w-60 rounded bg-popover/95 p-2 shadow-xl backdrop-blur">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search languages"
            className="hairline mb-2 w-full rounded bg-transparent px-2.5 py-1.5 font-mono text-[11px] text-parchment outline-none placeholder:text-muted-foreground/60"
          />
          <div className="max-h-64 overflow-y-auto">
            {list.map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLang(l);
                  setOpen(false);
                }}
                className={`ink-transition block w-full rounded px-2.5 py-1.5 text-left text-[12px] hover:bg-accent ${
                  l === lang ? "text-gold" : "text-muted-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="mt-2 px-2 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
            personae will answer in this language
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        className="hairline ink-transition flex items-center gap-2 rounded-full bg-popover/95 px-3.5 py-2 font-mono text-[11px] text-gold shadow-lg backdrop-blur hover:bg-accent"
      >
        <span aria-hidden>文A</span>
        <span className="max-w-[7rem] truncate">{lang}</span>
      </button>
    </div>
  );
}

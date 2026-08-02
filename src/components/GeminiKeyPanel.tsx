import { useState } from "react";
import { isLikelyGeminiKey, maskKey, useUserKey } from "@/lib/user-key";

/**
 * Reader's own Gemini key. Stored only in this browser, never uploaded to the
 * archive's database, never logged, never visible to another reader.
 */
export function GeminiKeyPanel({ compact }: { compact?: boolean }) {
  const [saved, save] = useUserKey();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    if (!isLikelyGeminiKey(v)) {
      setNote("That does not look like a Google AI Studio key — paste the whole key, no spaces.");
      return;
    }
    save(v);
    setDraft("");
    setNote("Key sealed into this browser. The archive is now unlimited for you.");
    setOpen(false);
  };

  if (saved && !open) {
    return (
      <div className="hairline rounded px-4 py-3 text-left">
        <p className="font-mono text-[11px] text-gold">
          ● your own key is active — unlimited, private
        </p>
        <p className="mt-1 font-mono text-[10.5px] text-muted-foreground">{maskKey(saved)}</p>
        <div className="mt-2 flex gap-4">
          <button
            onClick={() => setOpen(true)}
            className="font-mono text-[10.5px] text-muted-foreground hover:text-gold"
          >
            replace key
          </button>
          <button
            onClick={() => {
              save("");
              setNote("Key erased from this browser.");
            }}
            className="font-mono text-[10.5px] text-muted-foreground hover:text-signal"
          >
            forget key
          </button>
        </div>
        {note && <p className="mt-2 font-mono text-[10px] text-muted-foreground/80">{note}</p>}
      </div>
    );
  }

  return (
    <div className="hairline rounded p-4 text-left">
      <p className="smallcaps text-[11px] text-gold-dim">Bring your own key</p>
      {!compact && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Paste a free Google AI Studio (Gemini) key to make the archive unlimited — long
          conversations, images, PDFs, debates, no shared quota. Your key never leaves your own
          browser's storage: it is sent with your own request, used once, and never written to our
          database or shown to anyone else.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setNote(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          placeholder="AIza… or AQ…"
          aria-label="Your Gemini API key"
          className="hairline flex-1 rounded bg-transparent px-3 py-2 font-mono text-[12px] text-parchment outline-none placeholder:text-muted-foreground/60"
        />
        <button
          onClick={commit}
          className="ink-transition rounded bg-primary px-4 py-2 font-mono text-[11px] text-primary-foreground"
        >
          seal key
        </button>
      </div>
      {note && <p className="mt-2 font-mono text-[10.5px] text-signal">{note}</p>}
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
        get a key at aistudio.google.com/apikey · stored locally · never shared
      </p>
    </div>
  );
}

/** Inline prompt shown when a request fails for want of allowance. */
export function KeyPrompt({ message }: { message: string }) {
  const [saved] = useUserKey();
  const quota = /allowance|quota|credit|429|402|rejected/i.test(message);
  return (
    <div className="hairline rounded px-4 py-3">
      <p className="font-mono text-[12px] text-signal">{message}</p>
      {quota && !saved && (
        <div className="mt-3">
          <GeminiKeyPanel compact />
        </div>
      )}
    </div>
  );
}

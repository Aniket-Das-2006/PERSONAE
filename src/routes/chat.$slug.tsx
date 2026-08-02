import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArchiveHeader, TagPill } from "@/components/ArchiveChrome";
import { AttachmentPicker, type UploadedFile } from "@/components/Attachments";
import { ParticlePortrait, PortraitAvatar } from "@/components/ParticlePortrait";
import { ReaderButton } from "@/components/ReaderButton";
import type { Persona } from "@/data/personas";
import { askPersona, translateText } from "@/lib/persona.functions";
import { withKey } from "@/lib/user-key";
import { KeyPrompt } from "@/components/GeminiKeyPanel";
import { plainLanguage, useLanguage } from "@/lib/language";
import { voiceNote } from "@/lib/voices";
import {
  addHighlight,
  clearConversation,
  findPersona,
  getConversation,
  isCustom,
  noteConsultation,
  refreshCommunity,
  setConversation,
  uid,
  type ChatMessage,
} from "@/lib/archive-store";

export const Route = createFileRoute("/chat/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Consultation — PERSONAE` },
      {
        name: "description",
        content: `Consult the reconstructed reasoning of ${params.slug} in the Living Archive.`,
      },
      { property: "og:title", content: "A consultation — PERSONAE" },
      {
        property: "og:description",
        content: "Reason alongside a reconstructed mind, with documented provenance.",
      },
    ],
  }),
  component: ChatPage,
});

const ERAS = [
  { key: "", label: "Full life" },
  {
    key: "Answer as this figure in their formative, early years — before their defining works.",
    label: "Early years",
  },
  {
    key: "Answer as this figure at the height of their public life and influence.",
    label: "At the height",
  },
  {
    key: "Answer as this figure in their late years, looking back across the whole arc of their life.",
    label: "Late years",
  },
];

function ProvenanceBody({ message, showTags }: { message: ChatMessage; showTags: boolean }) {
  if (!message.provenance?.length || !showTags) {
    return <p className="whitespace-pre-wrap text-[14.5px] leading-[1.75]">{message.content}</p>;
  }
  return (
    <p className="text-[14.5px] leading-[1.9]">
      {message.provenance.map((s, i) => (
        <span
          key={i}
          className={
            s.type === "documented"
              ? "border-b border-gold/40"
              : "border-b border-dashed border-signal/50"
          }
          title={s.type === "documented" ? "documented" : "inferred"}
        >
          {s.text}{" "}
          <sup
            className={`font-mono text-[9px] ${s.type === "documented" ? "text-gold" : "text-signal"}`}
          >
            [{s.type === "documented" ? "doc" : "inf"}]
          </sup>{" "}
        </span>
      ))}
    </p>
  );
}

function ChatPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [language] = useLanguage();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [missing, setMissing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [showTags, setShowTags] = useState(true);
  const [live, setLive] = useState(true);
  const [emphasis, setEmphasis] = useState("");
  const [translated, setTranslated] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let p = findPersona(slug);
      if (!p) {
        await refreshCommunity().catch(() => []);
        p = findPersona(slug);
      }
      if (cancelled) return;
      if (!p) {
        setMissing(true);
        return;
      }
      setPersona(p);
      setMessages(getConversation(p.slug));
      setMissing(false);
      void noteConsultation(p.slug);
      window.setTimeout(() => inputRef.current?.focus(), 60);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  if (missing) {
    return (
      <div className="grain min-h-screen">
        <ArchiveHeader />
        <div className="mx-auto max-w-xl px-6 py-32 text-center">
          <h1 className="font-display text-3xl text-parchment">No such mind</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This slug is not catalogued in the archive.
          </p>
          <Link
            to="/archive"
            className="hairline mt-6 inline-block rounded px-4 py-2 text-[12px] text-gold"
          >
            Browse the archive
          </Link>
        </div>
      </div>
    );
  }

  if (!persona) return <div className="min-h-screen bg-ink" />;

  const send = async () => {
    const text = input.trim();
    if ((!text && files.length === 0) || busy) return;
    setError(null);
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text || "(attached material)",
      attachments: files.map((f) => ({ name: f.name, mime: f.mime })),
      createdAt: Date.now(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setConversation(persona.slug, next);
    setInput("");
    const sending = files;
    setFiles([]);
    setBusy(true);
    try {
      const res = await askPersona({
        data: {
          ...withKey(),
          slug: persona.slug,
          message: text,
          emphasis: emphasis || undefined,
          language: plainLanguage(language),
          live,
          attachments: sending,
          custom: isCustom(persona)
            ? { name: persona.name, role: persona.role, systemPrompt: persona.systemPrompt }
            : undefined,
          history: next.slice(-12, -1).map((m) => ({ role: m.role, content: m.content })),
        },
      });
      const reply: ChatMessage = {
        id: uid(),
        role: "persona",
        content: res.content,
        provenance: res.provenance,
        createdAt: Date.now(),
      };
      const withReply = [...next, reply];
      setMessages(withReply);
      setConversation(persona.slug, withReply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The archive did not respond.");
    } finally {
      setBusy(false);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  const translateOne = async (m: ChatMessage) => {
    setTranslated((t) => ({ ...t, [m.id]: "…" }));
    try {
      const res = await translateText({
        data: { ...withKey(), text: m.content, target: plainLanguage(language) },
      });
      setTranslated((t) => ({ ...t, [m.id]: res.content }));
    } catch (e) {
      setTranslated((t) => ({
        ...t,
        [m.id]: e instanceof Error ? e.message : "Translation failed.",
      }));
    }
  };

  const docCount = messages
    .flatMap((m) => m.provenance ?? [])
    .filter((s) => s.type === "documented").length;
  const infCount = messages
    .flatMap((m) => m.provenance ?? [])
    .filter((s) => s.type === "inferred").length;

  return (
    <div className="grain flex min-h-screen flex-col">
      <ArchiveHeader
        right={
          <span className="hairline flex items-center gap-2 rounded-full py-1 pr-3 pl-1">
            <PortraitAvatar name={persona.name} size={26} />
            <span className="font-display hidden max-w-[160px] truncate text-[13px] text-parchment sm:inline">
              {persona.name}
            </span>
            <button
              onClick={() => navigate({ to: "/" })}
              className="font-mono text-[10px] text-muted-foreground hover:text-signal"
              title="/exit — return to the neutral archive"
            >
              exit
            </button>
          </span>
        }
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0">
        <main className="min-w-0 flex-1 px-4 pt-8 pb-52 sm:px-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-6 text-center">
              <ParticlePortrait name={persona.name} size={150} />
              <h1 className="font-display mt-5 text-3xl text-parchment">{persona.name}</h1>
              <p className="smallcaps mt-1 text-[12px] text-muted-foreground">{persona.role}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {persona.tags.map((t) => (
                  <TagPill key={t}>{t}</TagPill>
                ))}
              </div>
              <p className="mt-5 max-w-2xl font-mono text-[12px] leading-relaxed text-muted-foreground">
                {persona.signature}
              </p>
              <p className="mt-6 max-w-xl font-mono text-[10.5px] leading-relaxed text-signal/80">
                {voiceNote(persona)}
              </p>
              <p className="mt-8 text-sm text-muted-foreground">
                No conversation yet. Put your question below — attach an image or PDF if you want it
                read.
              </p>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-8">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="hairline max-w-[85%] rounded-md bg-secondary px-4 py-3">
                    <p className="text-[14.5px] leading-relaxed text-parchment">{m.content}</p>
                    {m.attachments?.length ? (
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                        {m.attachments
                          .map((a) => `${a.mime.startsWith("image/") ? "🖼" : "📄"} ${a.name}`)
                          .join("  ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="group flex gap-3 sm:gap-4">
                  <PortraitAvatar name={persona.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <ProvenanceBody message={m} showTags={showTags} />
                    {translated[m.id] && (
                      <p className="hairline mt-3 rounded bg-ink-raised/50 p-3 text-[13.5px] leading-[1.8] whitespace-pre-wrap text-parchment/90">
                        {translated[m.id]}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-4 opacity-70 transition-opacity group-hover:opacity-100">
                      <ReaderButton persona={persona} text={m.content} compact />
                      <button
                        onClick={() => {
                          addHighlight({
                            id: uid(),
                            slug: persona.slug,
                            personaName: persona.name,
                            content: m.content,
                            createdAt: Date.now(),
                          });
                        }}
                        className="font-mono text-[10px] text-muted-foreground hover:text-gold"
                      >
                        save to codex
                      </button>
                      <button
                        onClick={() => void translateOne(m)}
                        className="font-mono text-[10px] text-muted-foreground hover:text-gold"
                      >
                        translate
                      </button>
                      <button
                        onClick={() => navigator.clipboard?.writeText(m.content)}
                        className="font-mono text-[10px] text-muted-foreground hover:text-gold"
                      >
                        copy
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div className="flex gap-4">
                <PortraitAvatar name={persona.name} size={34} />
                <p className="animate-slow-pulse font-mono text-[12px] text-muted-foreground">
                  composing a reply…
                </p>
              </div>
            )}

            {error && <KeyPrompt message={error} />}
            <div ref={endRef} />
          </div>
        </main>

        {drawer && (
          <aside className="hidden w-80 shrink-0 border-l border-border px-5 py-8 lg:block">
            <h2 className="font-display text-lg text-parchment">
              What&apos;s documented, and what&apos;s inferred.
            </h2>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
              This is a reconstruction of a reasoning style assembled from the historical record —
              not a resurrection. Each span of every reply is audited and labelled.
            </p>
            <div className="mt-6 space-y-3 font-mono text-[11px]">
              <p className="flex items-center justify-between">
                <span className="text-gold">[doc] documented</span>
                <span className="text-muted-foreground">{docCount}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-signal">[inf] inferred</span>
                <span className="text-muted-foreground">{infCount}</span>
              </p>
            </div>
            <label className="mt-8 block font-mono text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={showTags}
                onChange={(e) => setShowTags(e.target.checked)}
                className="mr-2 align-middle accent-[oklch(0.76_0.106_84)]"
              />
              show inline annotations
            </label>
            <label className="mt-3 block font-mono text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={live}
                onChange={(e) => setLive(e.target.checked)}
                className="mr-2 align-middle accent-[oklch(0.76_0.106_84)]"
              />
              feed today&apos;s headlines
            </label>

            <div className="mt-8 border-t border-border pt-6">
              <p className="smallcaps text-[11px] text-gold-dim">Timeline emphasis</p>
              <div className="mt-3 space-y-1.5">
                {ERAS.map((e) => (
                  <button
                    key={e.label}
                    onClick={() => setEmphasis(e.key)}
                    className={`block w-full rounded px-2 py-1.5 text-left font-mono text-[11px] ${
                      emphasis === e.key ? "bg-accent text-gold" : "text-muted-foreground"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-8 font-mono text-[10.5px] leading-relaxed text-signal/80">
              {voiceNote(persona)}
            </p>

            <button
              onClick={() => {
                clearConversation(persona.slug);
                setMessages([]);
              }}
              className="mt-8 font-mono text-[11px] text-muted-foreground hover:text-signal"
            >
              clear this conversation
            </button>
          </aside>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-ink/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <AttachmentPicker files={files} onChange={setFiles} disabled={busy} />
            <button
              onClick={() => setLive((v) => !v)}
              className={`hairline shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] ${
                live ? "text-gold" : "text-muted-foreground"
              }`}
              title="Feed the persona today's headlines"
            >
              {live ? "● live world" : "○ live world"}
            </button>
          </div>
          <div className="flex items-end gap-3">
            <span className="pb-3 font-mono text-sm text-gold">›</span>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={`Put a question to ${persona.name}…`}
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-3 text-[14px] text-parchment outline-none placeholder:text-muted-foreground/70"
            />
            <button
              onClick={() => setDrawer((d) => !d)}
              className="hairline mb-1.5 hidden rounded px-3 py-1.5 font-mono text-[10.5px] text-gold lg:block"
            >
              provenance
            </button>
            <button
              onClick={() => void send()}
              disabled={busy || (!input.trim() && files.length === 0)}
              className="ink-transition mb-1.5 rounded bg-primary px-4 py-2 font-mono text-[11px] text-primary-foreground disabled:opacity-40"
            >
              send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

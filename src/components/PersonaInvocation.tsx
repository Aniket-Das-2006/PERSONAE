import { useEffect, useState } from "react";
import type { Persona } from "@/data/personas";
import { ParticlePortrait } from "./ParticlePortrait";

function useTypewriter(text: string, active: boolean, speed = 16) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!active) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, active, speed]);
  return out;
}

/**
 * The Invocation — a ~1.2s materialization sequence used for persona selection,
 * hover previews and shareable persona cards.
 */
export function PersonaInvocation({
  persona,
  onComplete,
  size = 260,
  compact = false,
}: {
  persona: Persona;
  onComplete?: () => void;
  size?: number;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), 900);
    const t2 = window.setTimeout(() => setPhase(2), 1500);
    const t3 = window.setTimeout(() => onComplete?.(), 3400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [persona.slug, onComplete]);

  const signature = useTypewriter(persona.signature, phase >= 2, 14);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <ParticlePortrait name={persona.name} size={size} duration={1100} />

      {phase >= 1 && (
        <div className="animate-rise mt-6 max-w-xl">
          <h2 className="font-display text-3xl tracking-tight text-parchment sm:text-4xl">
            {persona.name}
          </h2>
          <p className="smallcaps mt-2 text-sm text-muted-foreground">{persona.role}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {persona.tags.map((tag, i) => (
              <span
                key={tag}
                className="animate-bleed hairline rounded-full px-3 py-1 text-[11px] tracking-wide text-gold"
                style={{ animationDelay: `${150 + i * 110}ms` }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {phase >= 2 && !compact && (
        <p className="mt-6 max-w-2xl font-mono text-[12.5px] leading-relaxed text-muted-foreground">
          {signature}
          <span className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-0.5 bg-gold [animation:cursor-blink_1s_step-end_infinite]" />
        </p>
      )}
    </div>
  );
}

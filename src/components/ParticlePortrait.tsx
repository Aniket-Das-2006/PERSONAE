import { useEffect, useRef } from "react";
import { initialsOf } from "@/data/personas";

type Props = {
  name: string;
  size?: number;
  /** 0 = scattered, 1 = fully assembled */
  play?: boolean;
  duration?: number;
  className?: string;
  density?: number;
};

type Dot = { tx: number; ty: number; sx: number; sy: number; r: number; d: number };

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stipple portrait: a gold dot-matrix silhouette assembled from the persona's
 * monogram plus a deterministic engraving-style frame. No photographs used.
 */
export function ParticlePortrait({
  name,
  size = 260,
  play = true,
  duration = 1100,
  className,
  density = 1,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Sample the monogram glyphs into a point cloud.
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return;
    octx.fillStyle = "#fff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.font = `400 ${size * 0.5}px Fraunces, Georgia, serif`;
    octx.fillText(initialsOf(name), size / 2, size / 2 + size * 0.02);
    const data = octx.getImageData(0, 0, size, size).data;

    const rand = mulberry(hash(name));
    const dots: Dot[] = [];
    const step = Math.max(2, Math.round(3.2 / density));
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const alpha = data[(y * size + x) * 4 + 3];
        if (alpha > 128 && rand() > 0.25) {
          dots.push({
            tx: x + (rand() - 0.5) * step,
            ty: y + (rand() - 0.5) * step,
            sx: size / 2 + (rand() - 0.5) * size * 2,
            sy: size / 2 + (rand() - 0.5) * size * 2,
            r: 0.5 + rand() * 0.9,
            d: rand() * 0.35,
          });
        }
      }
    }

    // Engraved ring of stipple dots framing the monogram.
    const ringCount = Math.round(140 * density);
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      const rad = size * (0.41 + (rand() - 0.5) * 0.012);
      dots.push({
        tx: size / 2 + Math.cos(a) * rad,
        ty: size / 2 + Math.sin(a) * rad,
        sx: size / 2 + (rand() - 0.5) * size * 2,
        sy: size / 2 + (rand() - 0.5) * size * 2,
        r: 0.4 + rand() * 0.7,
        d: rand() * 0.4,
      });
    }

    const easeInk = (t: number) => 1 - Math.pow(1 - t, 4);

    const draw = (progress: number) => {
      ctx.clearRect(0, 0, size, size);
      for (const dot of dots) {
        const local = Math.min(1, Math.max(0, (progress - dot.d) / (1 - dot.d)));
        const e = easeInk(local);
        const x = dot.sx + (dot.tx - dot.sx) * e;
        const y = dot.sy + (dot.ty - dot.sy) * e;
        ctx.globalAlpha = 0.25 + 0.75 * e;
        ctx.fillStyle = `rgb(212, 169, 78)`;
        ctx.beginPath();
        ctx.arc(x, y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (!play) {
      draw(1);
      return;
    }

    startRef.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / duration);
      draw(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [name, size, play, duration, density]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
      aria-hidden="true"
    />
  );
}

export function PortraitAvatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full hairline bg-ink-raised"
      style={{ width: size, height: size }}
      title={name}
    >
      <ParticlePortrait name={name} size={size - 4} duration={700} density={0.5} />
    </span>
  );
}

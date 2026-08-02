import type { Persona } from "@/data/personas";

/**
 * Constellation lenses. Each lens is a different pair of interpretable axes,
 * scored from a persona's tags, discipline and era. Every lens states plainly
 * which side of the map means what.
 */
export type Lens = {
  id: string;
  label: string;
  blurb: string;
  x: AxisDef;
  y: AxisDef;
};

export type AxisDef = {
  /** what the LEFT / BOTTOM extreme means */
  low: string;
  /** what the RIGHT / TOP extreme means */
  high: string;
  score: (p: Persona) => number; // -1 .. 1
};

const has = (p: Persona, ...words: string[]) => {
  const hay = [...p.tags, p.role, p.signature, p.discipline ?? ""].join(" ").toLowerCase();
  return words.some((w) => hay.includes(w.toLowerCase()));
};

/** weight of matching words minus weight of opposing words, squashed to -1..1 */
function pole(p: Persona, positive: string[], negative: string[]): number {
  const hay = [...p.tags, p.tags.join(" "), p.role, p.signature, p.discipline ?? ""]
    .join(" ")
    .toLowerCase();
  let s = 0;
  for (const w of positive) if (hay.includes(w.toLowerCase())) s += 1;
  for (const w of negative) if (hay.includes(w.toLowerCase())) s -= 1;
  // gentle deterministic jitter so identical scores do not stack perfectly
  let h = 0;
  for (let i = 0; i < p.slug.length; i++) h = (h * 31 + p.slug.charCodeAt(i)) >>> 0;
  const jitter = ((h % 1000) / 1000 - 0.5) * 0.5;
  return Math.max(-1, Math.min(1, s / 2.2 + jitter * 0.35));
}

export const LENSES: Lens[] = [
  {
    id: "temperament",
    label: "Temperament",
    blurb: "How a mind meets the world before it reasons about it.",
    x: {
      low: "Contemplative — withdraws to think",
      high: "Active — thinks by intervening",
      score: (p) =>
        pole(
          p,
          ["decisive", "pragmatic", "strategic", "militant", "revolutionary", "entrepreneur", "activist", "politic", "military", "reform"],
          ["contemplative", "mystical", "meditative", "ascetic", "scholarly", "reclusive", "philosoph", "poet"],
        ),
    },
    y: {
      low: "Sceptical — doubts first",
      high: "Devotional — believes first",
      score: (p) =>
        pole(
          p,
          ["mystical", "devotional", "religion", "faith", "prophetic", "visionary", "spiritual", "theolog"],
          ["skeptic", "sceptic", "empirical", "rational", "analytical", "scientific", "materialist", "science"],
        ),
    },
  },
  {
    id: "method",
    label: "Method",
    blurb: "How they build an argument and what counts as proof.",
    x: {
      low: "Deductive — from first principles",
      high: "Empirical — from observation",
      score: (p) =>
        pole(
          p,
          ["empirical", "experimental", "observant", "scientific", "medicine", "engineer", "inventive", "science"],
          ["deductive", "systematic", "theoretical", "abstract", "logical", "philosoph", "mathemat"],
        ),
    },
    y: {
      low: "Synthesising — reconciles opposites",
      high: "Dissenting — sharpens conflict",
      score: (p) =>
        pole(
          p,
          ["dissent", "provocative", "combative", "iconoclast", "radical", "subversive", "polemic", "revolutionary"],
          ["synthesizing", "synthesising", "reconciliatory", "harmonis", "conciliat", "integrative", "diplomat"],
        ),
    },
  },
  {
    id: "power",
    label: "Power",
    blurb: "Where they place authority and whose interest they defend.",
    x: {
      low: "Institutional — works through structures",
      high: "Insurgent — works against them",
      score: (p) =>
        pole(
          p,
          ["revolutionary", "rebel", "insurgent", "activist", "radical", "liberation", "resistance", "abolition"],
          ["statesman", "administrat", "institution", "monarch", "emperor", "governor", "founder", "chief", "president"],
        ),
    },
    y: {
      low: "Order — stability above all",
      high: "Liberty — freedom above all",
      score: (p) =>
        pole(
          p,
          ["liberty", "freedom", "individual", "libertarian", "emancipat", "rights", "democratic"],
          ["order", "discipline", "hierarch", "duty", "traditional", "conservative", "authoritarian", "military"],
        ),
    },
  },
  {
    id: "horizon",
    label: "Horizon",
    blurb: "The timescale a mind naturally reasons on.",
    x: {
      low: "Ancient & inherited",
      high: "Modern & invented",
      score: (p) => {
        const yr = p.eraStart ?? p.eraEnd ?? 1500;
        return Math.max(-1, Math.min(1, (yr - 1200) / 900));
      },
    },
    y: {
      low: "Local — a people, a place",
      high: "Universal — all of humanity",
      score: (p) =>
        pole(
          p,
          ["universal", "cosmopolitan", "humanist", "global", "scientific", "philosoph", "internationalist"],
          ["national", "tribal", "indigenous", "folk", "local", "communal", "ancestral", "founder"],
        ),
    },
  },
  {
    id: "expression",
    label: "Expression",
    blurb: "How they get an idea into another person's head.",
    x: {
      low: "Plain — argues in prose",
      high: "Poetic — argues in image",
      score: (p) =>
        pole(
          p,
          ["poet", "lyrical", "metaphor", "art", "music", "literary", "narrative", "imaginative", "visionary"],
          ["plain", "analytical", "technical", "precise", "rigorous", "science", "legal", "empirical"],
        ),
    },
    y: {
      low: "Private — writes for a few",
      high: "Public — speaks to crowds",
      score: (p) =>
        pole(
          p,
          ["orator", "charismatic", "populist", "public", "activist", "leader", "preacher", "performer", "politic"],
          ["scholarly", "reclusive", "monastic", "esoteric", "private", "ascetic", "mystical"],
        ),
    },
  },
];

export const lensById = (id: string) => LENSES.find((l) => l.id === id) ?? LENSES[0];

export function coords(p: Persona, lens: Lens) {
  return { x: lens.x.score(p), y: lens.y.score(p) };
}

export const disciplineOf = (p: Persona) =>
  p.discipline ?? (has(p, "philosoph") ? "Philosophy" : "Philosophy");

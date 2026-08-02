import raw from "./personas.json";

export type Persona = {
  slug: string;
  name: string;
  role: string;
  group: string;
  aliases: string[];
  tags: string[];
  signature: string;
  eraStart: number | null;
  eraEnd: number | null;
  /** Modern sovereign country, historical polity or cultural nation. */
  country?: string;
  /** Broad world region used for grouping and the constellation. */
  region?: string;
  discipline?: string;
  gender?: string;
  /** Character-matched synthetic voice id used by Reader Mode. */
  voice?: string;
};

export const personas = raw as Persona[];

export const personaBySlug = (slug: string): Persona | undefined =>
  personas.find((p) => p.slug === slug || p.aliases.includes(slug));

export const allTags = Array.from(new Set(personas.flatMap((p) => p.tags))).sort();
export const allGroups = Array.from(new Set(personas.map((p) => p.group))).sort();

export function searchPersonas(query: string, limit = 40): Persona[] {
  const q = query.trim().toLowerCase();
  if (!q) return personas.slice(0, limit);
  const scored: Array<{ p: Persona; s: number }> = [];
  for (const p of personas) {
    const name = p.name.toLowerCase();
    let s = -1;
    if (name.startsWith(q)) s = 0;
    else if (p.slug.startsWith(q) || p.aliases.some((a) => a.startsWith(q))) s = 1;
    else if (name.includes(q)) s = 2;
    else if (p.group.toLowerCase().includes(q)) s = 3;
    else if ((p.country ?? "").toLowerCase().includes(q)) s = 3;
    else if (p.tags.some((t) => t.toLowerCase().includes(q))) s = 4;
    else if (p.role.toLowerCase().includes(q)) s = 5;
    if (s >= 0) scored.push({ p, s });
  }
  scored.sort((a, b) => a.s - b.s || a.p.name.localeCompare(b.p.name));
  return scored.slice(0, limit).map((x) => x.p);
}

export function groupByRegion(list: Persona[]): Array<[string, Persona[]]> {
  const map = new Map<string, Persona[]>();
  for (const p of list) {
    const k = p.region || p.group || "Unattributed";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

/** Two letters: first initial of the given name plus first initial of the surname. */
export function initialsOf(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0][0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? first);
  return (first + last).toUpperCase();
}

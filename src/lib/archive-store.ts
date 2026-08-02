import { personas as basePersonas, type Persona } from "@/data/personas";
import { supabase } from "@/integrations/supabase/client";

const CUSTOM_KEY = "personae.custom";
const COMMUNITY_KEY = "personae.community";
const CONVO_KEY = (slug: string) => `personae.convo.${slug}`;
const CODEX_KEY = "personae.codex";
const LANG_KEY = "personae.language";

export type CustomPersona = Persona & { systemPrompt: string; custom: true };

export type ChatMessage = {
  id: string;
  role: "user" | "persona";
  content: string;
  provenance?: Array<{ text: string; type: "documented" | "inferred" }>;
  attachments?: Array<{ name: string; mime: string }>;
  createdAt: number;
};

export type Highlight = {
  id: string;
  slug: string;
  personaName: string;
  content: string;
  note?: string;
  tags?: string[];
  createdAt: number;
};

const hasWindow = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/* Custom (private) personas */
export const getCustomPersonas = (): CustomPersona[] => read<CustomPersona[]>(CUSTOM_KEY, []);

export function saveCustomPersona(p: CustomPersona) {
  const all = getCustomPersonas().filter((x) => x.slug !== p.slug);
  write(CUSTOM_KEY, [...all, p]);
}

export function deleteCustomPersona(slug: string) {
  write(
    CUSTOM_KEY,
    getCustomPersonas().filter((x) => x.slug !== slug),
  );
}

/* Community personas — shared by everyone using the archive */
export type CommunityRow = {
  slug: string;
  name: string;
  role: string;
  country: string;
  region: string;
  discipline: string;
  group_name: string;
  aliases: string[];
  tags: string[];
  signature: string;
  era_start: number | null;
  era_end: number | null;
  gender: string;
  voice: string;
  system_prompt: string;
  consultations: number;
};

const fromRow = (r: CommunityRow): CustomPersona => ({
  slug: r.slug,
  name: r.name,
  role: r.role,
  group: r.group_name || r.country,
  country: r.country,
  region: r.region,
  discipline: r.discipline,
  gender: r.gender,
  voice: r.voice,
  aliases: r.aliases ?? [],
  tags: r.tags ?? [],
  signature: r.signature,
  eraStart: r.era_start,
  eraEnd: r.era_end,
  systemPrompt: r.system_prompt,
  custom: true,
});

export const getCommunityPersonas = (): CustomPersona[] =>
  read<CustomPersona[]>(COMMUNITY_KEY, []);

export async function refreshCommunity(): Promise<CustomPersona[]> {
  const { data, error } = await supabase
    .from("community_personas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return getCommunityPersonas();
  const list = (data as unknown as CommunityRow[]).map(fromRow);
  write(COMMUNITY_KEY, list);
  return list;
}

export async function publishPersona(p: CustomPersona & { discipline?: string }) {
  const row = {
    slug: p.slug,
    name: p.name,
    role: p.role,
    country: p.country ?? "Unattributed",
    region: p.region ?? "Global",
    discipline: p.discipline ?? "Philosophy",
    group_name: p.group || p.country || "Unattributed",
    aliases: p.aliases ?? [],
    tags: p.tags ?? [],
    signature: p.signature ?? "",
    era_start: p.eraStart,
    era_end: p.eraEnd,
    gender: p.gender ?? "unknown",
    voice: p.voice ?? "alloy",
    system_prompt: p.systemPrompt,
  };
  const { error } = await supabase.from("community_personas").upsert(row, { onConflict: "slug" });
  if (error) throw new Error(error.message);
  await refreshCommunity();
}

export async function noteConsultation(slug: string) {
  try {
    await supabase.rpc("increment_persona_consultations", { _slug: slug });
  } catch {
    /* popularity tracking is best-effort */
  }
}

export function allPersonas(): Persona[] {
  const seen = new Set<string>();
  const out: Persona[] = [];
  for (const p of [...getCustomPersonas(), ...getCommunityPersonas(), ...basePersonas]) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    out.push(p);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function findPersona(slug: string): Persona | CustomPersona | undefined {
  return (
    getCustomPersonas().find((p) => p.slug === slug) ??
    getCommunityPersonas().find((p) => p.slug === slug) ??
    basePersonas.find((p) => p.slug === slug || p.aliases.includes(slug))
  );
}

export const isCustom = (p: Persona | CustomPersona): p is CustomPersona =>
  (p as CustomPersona).custom === true;

/* Conversations */
export const getConversation = (slug: string): ChatMessage[] =>
  read<ChatMessage[]>(CONVO_KEY(slug), []);

export const setConversation = (slug: string, msgs: ChatMessage[]) => write(CONVO_KEY(slug), msgs);

export const clearConversation = (slug: string) => write(CONVO_KEY(slug), []);

/* Codex */
export const getHighlights = (): Highlight[] => read<Highlight[]>(CODEX_KEY, []);

export function addHighlight(h: Highlight) {
  write(CODEX_KEY, [h, ...getHighlights()]);
}

export function updateHighlight(id: string, patch: Partial<Highlight>) {
  write(
    CODEX_KEY,
    getHighlights().map((h) => (h.id === id ? { ...h, ...patch } : h)),
  );
}

export function removeHighlight(id: string) {
  write(
    CODEX_KEY,
    getHighlights().filter((h) => h.id !== id),
  );
}

/* Language preference */
export const getLanguage = (): string => read<string>(LANG_KEY, "English");
export const setLanguage = (l: string) => write(LANG_KEY, l);

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

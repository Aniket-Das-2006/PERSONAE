/**
 * Google keeps retiring model ids (e.g. `gemini-2.5-flash` became unavailable
 * to new keys), so we never hardcode one. We ask the reader's own key which
 * models it can actually use, then pick the best match from a preference
 * order. The answer is cached in memory per key-fingerprint — never the key
 * itself — so a hot path costs one extra request at most.
 */

const LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200";

/** Non-reversible short fingerprint so cache keys never hold a real key. */
function fingerprint(key: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    h1 = ((h1 ^ key.charCodeAt(i)) * 16777619) >>> 0;
    h2 = ((h2 + key.charCodeAt(i) * (i + 7)) * 2654435761) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

type Listed = { name: string; methods: string[] };

const listCache = new Map<string, { at: number; models: Listed[] }>();
const TTL = 10 * 60 * 1000;

async function listModels(key: string): Promise<Listed[]> {
  const fp = fingerprint(key);
  const hit = listCache.get(fp);
  if (hit && Date.now() - hit.at < TTL) return hit.models;

  const res = await fetch(LIST_URL, { headers: { "x-goog-api-key": key } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  };
  const models: Listed[] = (data.models ?? []).map((m) => ({
    name: (m.name ?? "").replace(/^models\//, ""),
    methods: m.supportedGenerationMethods ?? [],
  }));
  listCache.set(fp, { at: Date.now(), models });
  return models;
}

/** Forget a cached listing (used after a 404 on a previously-good model). */
export function forgetModelCache(key: string) {
  listCache.delete(fingerprint(key));
}

/** Newest-first preferences for ordinary multimodal chat. */
const CHAT_PREFS = [
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash-lite",
  "gemini-pro-latest",
];

/** Newest-first preferences for speech synthesis. */
const TTS_PREFS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-flash-tts",
  "gemini-2.5-pro-preview-tts",
  "gemini-2.5-pro-tts",
];

function rank(available: Listed[], prefs: string[], method: string, fallbackHint: RegExp) {
  const usable = available.filter((m) => m.methods.includes(method));
  const names = new Set(usable.map((m) => m.name));
  const ordered: string[] = [];
  for (const p of prefs) if (names.has(p)) ordered.push(p);
  // Anything else that looks right, so a brand-new naming scheme still works.
  for (const m of usable) {
    if (!ordered.includes(m.name) && fallbackHint.test(m.name) && !/exp|thinking/.test(m.name)) {
      ordered.push(m.name);
    }
  }
  return ordered;
}

/** Chat-capable model ids this key may use, best first. */
export async function chatModelsFor(key: string): Promise<string[]> {
  const list = await listModels(key);
  const ordered = rank(list, CHAT_PREFS, "generateContent", /flash|pro/);
  return ordered.length ? ordered : CHAT_PREFS;
}

/** Speech-capable model ids this key may use, best first. */
export async function ttsModelsFor(key: string): Promise<string[]> {
  const list = await listModels(key);
  const ordered = rank(list, TTS_PREFS, "generateContent", /tts/).filter((n) => /tts/.test(n));
  return ordered.length ? ordered : TTS_PREFS;
}

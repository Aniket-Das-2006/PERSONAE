/**
 * Live world context. Every persona is grounded in what is happening right now,
 * however small the topic, by pulling fresh headlines from public news feeds at
 * question time. Cached briefly so a burst of questions costs one fetch.
 */

type Item = { title: string; source: string; when: string };

const cache = new Map<string, { at: number; items: Item[] }>();
const TTL = 5 * 60 * 1000;

const STOP = new Set(
  "the a an and or of to in on for with about what who why how is are was were do does did i you he she it they we my your our their me him her them this that these those can could should would will shall may might must have has had been being from as at by not no yes if then than so very much more most latest news today now current please tell explain think opinion view".split(
    " ",
  ),
);

function keywords(text: string, max = 6): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  const seen: string[] = [];
  for (const w of words) if (!seen.includes(w)) seen.push(w);
  return seen.slice(0, max).join(" ");
}

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function fetchFeed(url: string): Promise<Item[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; PersonaeArchive/1.0)" },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const items: Item[] = [];
  const blocks = xml.split("<item>").slice(1, 13);
  for (const b of blocks) {
    const title = decode(b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const source = decode(b.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "");
    const when = decode(b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
    if (title) items.push({ title, source, when });
  }
  return items;
}

export async function liveContext(topic: string): Promise<string> {
  const key = keywords(topic) || "world";
  const now = Date.now();
  const hit = cache.get(key);
  let items = hit && now - hit.at < TTL ? hit.items : [];

  if (items.length === 0) {
    try {
      const q = encodeURIComponent(key);
      const [topical, general] = await Promise.all([
        fetchFeed(`https://news.google.com/rss/search?q=${q}+when:14d&hl=en-US&gl=US&ceid=US:en`),
        fetchFeed(`https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en`),
      ]);
      items = [...topical.slice(0, 8), ...general.slice(0, 6)];
      cache.set(key, { at: now, items });
    } catch {
      items = [];
    }
  }

  const stamp = new Date().toUTCString();
  if (items.length === 0) {
    return `LIVE CONTEXT — the present moment is ${stamp}. No live headline feed was reachable for this question; say so plainly if the answer depends on very recent events.`;
  }
  const lines = items
    .map((i) => `- ${i.title}${i.source ? ` (${i.source})` : ""}${i.when ? ` — ${i.when}` : ""}`)
    .join("\n");
  return `LIVE CONTEXT — retrieved from public news feeds at ${stamp}. Treat these as today's facts about the world, and use them freely when the question touches current events, however minor:\n${lines}\n\nYou may reason about anything here as a contemporary reality, while remaining the historical figure you are.`;
}

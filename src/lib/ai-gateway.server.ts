import { chatModelsFor, forgetModelCache } from "./gemini-models.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

export type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export type GwMessage = { role: string; content: string | Part[] };

/* ---------- Gemini (bring-your-own key) fallback ---------- */

type GemPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function splitDataUrl(url: string): { mimeType: string; data: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(url);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

function toGeminiParts(content: string | Part[]): GemPart[] {
  if (typeof content === "string") return [{ text: content }];
  const out: GemPart[] = [];
  for (const p of content) {
    if (p.type === "text") out.push({ text: p.text });
    else if (p.type === "image_url") {
      const inline = splitDataUrl(p.image_url.url);
      if (inline) out.push({ inlineData: inline });
      else out.push({ text: p.image_url.url });
    } else {
      const inline = splitDataUrl(p.file.file_data);
      if (inline) out.push({ inlineData: inline });
    }
  }
  return out.length ? out : [{ text: "" }];
}

async function geminiChat(
  key: string,
  messages: GwMessage[],
  opts?: { jsonObject?: boolean },
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(m.content),
    }));

  const body = JSON.stringify({
    contents: contents.length ? contents : [{ role: "user", parts: [{ text: "Hello." }] }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: {
      temperature: 0.9,
      ...(opts?.jsonObject ? { responseMimeType: "application/json" } : {}),
    },
  });

  // Model ids get retired without notice, so walk the ids this key can
  // actually use until one answers.
  let candidates: string[];
  try {
    candidates = (await chatModelsFor(key)).slice(0, 4);
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    // An invalid key fails listing too — report that plainly. Any other
    // listing problem (restricted key, transient) falls back to known ids.
    if (/40[013]/.test(m)) throw e;
    candidates = ["gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash"];
  }
  let last = "no model available for this key";

  for (const model of candidates) {
    const res = await fetch(`${GEMINI}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    }

    const text = await res.text();
    last = `Gemini error ${res.status}: ${text.slice(0, 300)}`;
    // Try the next model if the current one is unavailable, not found, or rate-limited.
    if (res.status !== 404 && res.status !== 400 && res.status !== 503 && res.status !== 429) break;
    forgetModelCache(key);
  }

  throw new Error(last);
}

/* ---------- Primary: Lovable AI Gateway ---------- */

export async function gatewayChat(
  messages: GwMessage[],
  opts?: { jsonObject?: boolean; userKey?: string },
): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  // Per-request reader key wins: unmetered, private, never persisted or logged.
  const byo = (opts?.userKey ?? "").trim() || process.env.GEMINI_API_KEY;

  if (byo) {
    try {
      return await geminiChat(byo, messages, opts);
    } catch (e) {
      // A reader's own key failing is their key's problem — report it plainly
      // rather than silently spending the shared allowance.
      if (opts?.userKey) {
        const msg = e instanceof Error ? e.message : "unknown error";
        const raw = (opts.userKey ?? "").trim();
        const clean = (
          raw ? msg.split(raw).join("«your key»") : msg
        ).replace(/\b(?:AIza|AQ)[0-9A-Za-z._\-]{10,}/g, "«your key»");
        
        if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("key")) {
          throw new Error(`Your Gemini key was rejected: ${clean.slice(0, 220)}`);
        } else {
          throw new Error(clean.slice(0, 220));
        }
      }
      if (!key) throw e;
    }
  }

  if (!key) throw new Error("No AI key configured.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      messages,
      ...(opts?.jsonObject ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429)
      throw new Error("The archive is receiving too many requests. Please try again shortly.");
    if (res.status === 402)
      throw new Error(
        "The archive's shared allowance is exhausted. Add your own Gemini API key on the landing page — it stays in your browser, is never shared, and makes the archive unlimited for you.",
      );
    throw new Error(`Gateway error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}


/** Attachments coming from the browser, already base64 data URLs. */
export type Attachment = { name: string; mime: string; dataUrl: string };

export function partsFor(text: string, attachments: Attachment[] = []): string | Part[] {
  if (attachments.length === 0) return text;
  const parts: Part[] = [{ type: "text", text }];
  for (const a of attachments) {
    if (a.mime.startsWith("image/")) {
      parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
    } else {
      parts.push({ type: "file", file: { filename: a.name, file_data: a.dataUrl } });
    }
  }
  return parts;
}

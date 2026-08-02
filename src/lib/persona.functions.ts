import { createServerFn } from "@tanstack/react-start";
import {
  AskInput,
  DebateInput,
  DistillInput,
  DraftInput,
  JudgeInput,
  STYLE,
  SynthInput,
  TranslateInput,
} from "./persona-schemas";

export type ProvenanceSegment = { text: string; type: "documented" | "inferred" };

export const askPersona = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const { gatewayChat, partsFor } = await import("./ai-gateway.server");
    const { systemPromptFor } = await import("./persona-prompts.server");
    const { liveContext } = await import("./news.server");

    const basePrompt = data.custom?.systemPrompt ?? systemPromptFor(data.slug);
    if (!basePrompt) throw new Error("Unknown persona");
    const label = data.custom ? `${data.custom.name} (${data.custom.role})` : data.slug;

    const live = data.live ? await liveContext(data.message || label) : "";

    const system =
      basePrompt +
      (data.emphasis ? `\n\nEmphasis for this consultation: ${data.emphasis}` : "") +
      (live ? `\n\n${live}` : "") +
      (data.attachments.length
        ? "\n\nThe questioner has attached documents or images. Read them closely and ground your reply in what they actually contain, citing specific details."
        : "") +
      (data.language && data.language !== "English"
        ? `\n\nWrite your reply entirely in ${data.language}, in natural idiomatic prose.`
        : "") +
      STYLE;

    const content = await gatewayChat([
      { role: "system", content: system },
      ...data.history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: partsFor(data.message || "Read the attached material and respond.", data.attachments),
      },
    ], { userKey: data.userKey });

    let provenance: ProvenanceSegment[] = [];
    try {
      const raw = await gatewayChat(
        [
          {
            role: "system",
            content:
              'You audit historical-persona responses. Split the assistant text into consecutive sentence-level spans covering the ENTIRE text verbatim in order. Label each span "documented" when it reflects the well-attested historical record of the figure, or "inferred" when it is plausible extrapolation, style, or advice beyond the record. Reply with JSON: {"segments":[{"text":string,"type":"documented"|"inferred"}]}',
          },
          { role: "user", content: `Figure: ${label}\n\nText:\n${content}` },
        ],
        { jsonObject: true, userKey: data.userKey },
      );
      const parsed = JSON.parse(raw) as { segments?: ProvenanceSegment[] };
      if (Array.isArray(parsed.segments)) {
        provenance = parsed.segments.filter(
          (s) => typeof s?.text === "string" && (s.type === "documented" || s.type === "inferred"),
        );
      }
    } catch {
      provenance = [];
    }

    return { content, provenance };
  });

export const synthesizeCouncil = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SynthInput.parse(input))
  .handler(async ({ data }) => {
    const { gatewayChat } = await import("./ai-gateway.server");
    const { councilSystem } = await import("./council.server");
    const body = data.answers.map((a) => `### ${a.name}\n${a.content}`).join("\n\n");
    const content = await gatewayChat([
      { role: "system", content: councilSystem(data.mode) },
      { role: "user", content: `Question: ${data.question}\n\n${body}` },
    ], { userKey: data.userKey });
    return { content };
  });

export const draftPersona = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DraftInput.parse(input))
  .handler(async ({ data }) => {
    const { gatewayChat } = await import("./ai-gateway.server");
    const { liveContext } = await import("./news.server");
    const { DRAFT_SYSTEM } = await import("./compose.server");

    const live = await liveContext(data.name);

    const raw = await gatewayChat(
      [
        { role: "system", content: DRAFT_SYSTEM },
        {
          role: "user",
          content: `Figure: ${data.name}\nArchivist's context: ${data.context || "none"}\n\n${live}`,
        },
      ],
      { jsonObject: true, userKey: data.userKey },
    );
    return JSON.parse(raw) as {
      name: string;
      role: string;
      country: string;
      region: string;
      discipline: string;
      gender: string;
      voice: string;
      tags: string[];
      signature: string;
      eraStart: number | null;
      eraEnd: number | null;
      systemPrompt: string;
      confidence: number;
      sources: string[];
      caution: string;
    };
  });

export const debateTurn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DebateInput.parse(input))
  .handler(async ({ data }) => {
    const { gatewayChat } = await import("./ai-gateway.server");
    const { systemPromptFor } = await import("./persona-prompts.server");
    const { liveContext } = await import("./news.server");
    const { debateInstruction } = await import("./council.server");

    const base = data.speaker.systemPrompt ?? systemPromptFor(data.speaker.slug);
    if (!base) throw new Error("Unknown persona");
    const live = data.live ? await liveContext(data.topic) : "";

    const transcript = data.transcript.length
      ? data.transcript.map((t) => `${t.name}: ${t.content}`).join("\n\n")
      : "(You speak first.)";

    const raw = await gatewayChat(
      [
        {
          role: "system",
          content:
            `${base}\n\n${live}\n\n${debateInstruction(data.speaker.name, data.others, data.round)}` +
            (data.language && data.language !== "English"
              ? `\n\nWrite the "content" field entirely in ${data.language}, in natural idiomatic prose. Keep the other JSON fields in English.`
              : ""),
        },
        { role: "user", content: `MOTION: ${data.topic}\n\nTRANSCRIPT SO FAR:\n${transcript}` },
      ],
      { jsonObject: true, userKey: data.userKey },
    );

    try {
      const parsed = JSON.parse(raw) as {
        content?: string;
        concluded?: boolean;
        addressing?: string;
        stance?: string;
      };
      return {
        content: parsed.content ?? "",
        concluded: Boolean(parsed.concluded),
        addressing: parsed.addressing ?? "",
        stance: parsed.stance ?? "",
      };
    } catch {
      return { content: raw, concluded: false, addressing: "", stance: "" };
    }
  });

export const judiciarySummary = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => JudgeInput.parse(input))
  .handler(async ({ data }) => {
    const { gatewayChat } = await import("./ai-gateway.server");
    const { JUDICIARY_SYSTEM } = await import("./council.server");
    const body = data.transcript.map((t) => `${t.name}: ${t.content}`).join("\n\n");
    const raw = await gatewayChat(
      [
        {
          role: "system",
          content:
            JUDICIARY_SYSTEM +
            (data.language && data.language !== "English"
              ? `\n\nWrite every string in your JSON in ${data.language}, except personal names.`
              : ""),
        },
        { role: "user", content: `MOTION: ${data.topic}\n\nTRANSCRIPT:\n${body}` },
      ],
      { jsonObject: true, userKey: data.userKey },
    );
    try {
      return JSON.parse(raw) as {
        summary: string;
        agreed: string[];
        contested: string[];
        strongest: { name: string; why: string };
        ruling: string;
      };
    } catch {
      return {
        summary: raw,
        agreed: [],
        contested: [],
        strongest: { name: "", why: "" },
        ruling: "",
      };
    }
  });

export const translateText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data }) => {
    const { gatewayChat } = await import("./ai-gateway.server");
    const content = await gatewayChat([
      {
        role: "system",
        content: `You are a literary translator. Translate the user's text into ${data.target}, preserving register, cadence and paragraph breaks. Return only the translation, with no notes.`,
      },
      { role: "user", content: data.text },
    ], { userKey: data.userKey });
    return { content };
  });

export const distillCodex = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DistillInput.parse(input))
  .handler(async ({ data }) => {
    const { gatewayChat } = await import("./ai-gateway.server");
    const { DISTILL_SYSTEM } = await import("./council.server");
    const body = data.passages.map((p) => `### ${p.personaName}\n${p.content}`).join("\n\n");
    const raw = await gatewayChat(
      [
        { role: "system", content: DISTILL_SYSTEM },
        {
          role: "user",
          content: `${data.question ? `The reader asks: ${data.question}\n\n` : ""}PASSAGES:\n${body}`,
        },
      ],
      { jsonObject: true, userKey: data.userKey },
    );
    try {
      return JSON.parse(raw) as {
        themes: Array<{ title: string; body: string; voices: string[] }>;
        tension: string;
        prompt: string;
      };
    } catch {
      return { themes: [{ title: "Reading", body: raw, voices: [] }], tension: "", prompt: "" };
    }
  });

import { z } from "zod";

export const AttachmentSchema = z.object({
  name: z.string().max(200),
  mime: z.string().max(120),
  dataUrl: z.string().max(9_000_000),
});

export const CustomPersonaSchema = z.object({
  name: z.string().max(160),
  role: z.string().max(300).default(""),
  systemPrompt: z.string().max(12000),
});

/** Reader-supplied Gemini key: travels per-request, never stored server-side. */
const userKey = z.string().max(300).optional();

export const AskInput = z.object({
  userKey,
  slug: z.string().min(1),
  message: z.string().max(6000).default(""),
  emphasis: z.string().max(300).optional(),
  language: z.string().max(60).optional(),
  live: z.boolean().default(true),
  attachments: z.array(AttachmentSchema).max(4).default([]),
  custom: CustomPersonaSchema.optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "persona"]), content: z.string().max(6000) }))
    .max(24)
    .default([]),
});

export const SynthInput = z.object({
  userKey,
  question: z.string().min(1).max(2000),
  mode: z.enum(["synthesis", "verdict", "tensions", "action"]).default("synthesis"),
  answers: z.array(z.object({ name: z.string(), content: z.string().max(6000) })).min(2).max(4),
});

export const DraftInput = z.object({
  userKey,
  name: z.string().min(1).max(120),
  context: z.string().max(4000).optional(),
});

export const DebateInput = z.object({
  userKey,
  language: z.string().max(60).optional(),
  topic: z.string().min(1).max(1200),
  speaker: z.object({
    slug: z.string(),
    name: z.string(),
    role: z.string().default(""),
    systemPrompt: z.string().max(12000).optional(),
  }),
  others: z.array(z.string()).max(4).default([]),
  round: z.number().int().min(1).max(12),
  live: z.boolean().default(true),
  transcript: z
    .array(z.object({ name: z.string(), content: z.string().max(4000) }))
    .max(40)
    .default([]),
});

export const JudgeInput = z.object({
  userKey,
  language: z.string().max(60).optional(),
  topic: z.string().min(1).max(1200),
  transcript: z.array(z.object({ name: z.string(), content: z.string().max(4000) })).max(40),
});

export const TranslateInput = z.object({
  userKey,
  text: z.string().min(1).max(8000),
  target: z.string().min(2).max(60),
});

export const DistillInput = z.object({
  userKey,
  passages: z
    .array(z.object({ personaName: z.string(), content: z.string().max(4000) }))
    .min(1)
    .max(40),
  question: z.string().max(600).optional(),
});

export const STYLE =
  "\n\nAnswer in first person, in 120-260 words, in a formal but warm register. Do not use emoji. Do not break character with disclaimers.";

import type { Persona } from "@/data/personas";

export const VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
] as const;

/**
 * No authentic recording of any figure in the archive is used or cloned.
 * Reader Mode speaks with a character-matched synthetic voice, and every
 * persona carries an asterisk saying so.
 */
export function hasAuthenticVoice(_p: Persona): boolean {
  return false;
}

export function voiceFor(p: Persona): string {
  if (p.voice && (VOICES as readonly string[]).includes(p.voice)) return p.voice;
  const male = ["ash", "onyx", "echo", "verse", "ballad"];
  const female = ["coral", "nova", "shimmer", "sage", "fable"];
  let h = 0;
  for (let i = 0; i < p.slug.length; i++) h = (h * 33 + p.slug.charCodeAt(i)) >>> 0;
  const pool = p.gender === "female" ? female : p.gender === "male" ? male : [...male, ...female];
  return pool[h % pool.length];
}

export function voiceNote(p: Persona): string {
  return `* No authentic recording of ${p.name} could be fetched — Reader Mode uses a character-matched synthetic voice, not their real one.`;
}

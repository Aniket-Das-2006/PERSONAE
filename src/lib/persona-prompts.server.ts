import prompts from "@/data/persona-prompts.json";

const map = prompts as Record<string, string>;

export function systemPromptFor(slug: string): string | undefined {
  return map[slug];
}

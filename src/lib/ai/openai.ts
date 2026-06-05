import OpenAI from "openai";

/**
 * OpenAI client, lazily created. Returns null when no key is configured so every
 * caller can fall back to deterministic, data-grounded text. This is what keeps
 * the live demo unbreakable: AI when available, accurate fallback otherwise.
 */
let client: OpenAI | null | undefined;

export function getOpenAI(): OpenAI | null {
  if (client !== undefined) return client;
  const key = process.env.OPENAI_API_KEY;
  client = key ? new OpenAI({ apiKey: key }) : null;
  return client;
}

export const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
export const aiEnabled = () => Boolean(process.env.OPENAI_API_KEY);

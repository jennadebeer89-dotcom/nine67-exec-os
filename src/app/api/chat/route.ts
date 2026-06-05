import { getExecState } from "@/lib/engine";
import { buildContext } from "@/lib/ai/context";
import { getOpenAI, MODEL } from "@/lib/ai/openai";
import { CHAT_PROMPT } from "@/lib/ai/prompts";
import { fallbackAnswer } from "@/lib/ai/fallbackChat";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Parse defensively — a malformed request must never 500, only degrade gracefully. */
function parseMessages(body: unknown): ChatMessage[] {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant"),
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const streamText = (text: string, mode: "live" | "fallback") =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(text));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain; charset=utf-8", "X-AI-Mode": mode } },
    );

  let messages: ChatMessage[] = [];
  try {
    messages = parseMessages(await req.json());
  } catch {
    // invalid / empty JSON body
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUser.trim()) {
    return streamText(
      "Ask me about clients at risk, revenue at risk, over-budget projects, team capacity, what changed this week, or why a specific project is flagged.",
      "fallback",
    );
  }

  const state = await getExecState();
  const openai = getOpenAI();

  // Fallback: deterministic, grounded answer streamed in one go.
  if (!openai) return streamText(fallbackAnswer(lastUser, state), "fallback");

  // Live: stream the model grounded in the snapshot.
  const context = buildContext(state);
  const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          temperature: 0.3,
          stream: true,
          messages: [
            { role: "system", content: CHAT_PROMPT },
            { role: "system", content: `SNAPSHOT (your only source of truth):\n${context}` },
            ...history,
          ],
        });
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } catch {
        controller.enqueue(encoder.encode(fallbackAnswer(lastUser, state)));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-AI-Mode": "live" },
  });
}

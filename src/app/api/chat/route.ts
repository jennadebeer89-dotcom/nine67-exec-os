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

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const state = await getExecState();
  const openai = getOpenAI();

  const encoder = new TextEncoder();

  // Fallback: deterministic, grounded answer streamed in one go.
  if (!openai) {
    const answer = fallbackAnswer(lastUser, state);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(answer));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-AI-Mode": "fallback" },
    });
  }

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

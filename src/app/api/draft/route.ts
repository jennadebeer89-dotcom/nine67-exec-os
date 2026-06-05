import { getExecState } from "@/lib/engine";
import { draftOutreach } from "@/lib/ai/insights";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let itemId = "";
  try {
    itemId = (((await req.json()) as { itemId?: string }).itemId ?? "").toString();
  } catch {
    // ignore malformed body
  }

  const state = await getExecState();
  const item = state.briefing.items.find((i) => i.id === itemId);
  if (!item) {
    return Response.json({ error: "Unknown item" }, { status: 404 });
  }

  const draft = await draftOutreach(item, state);
  return Response.json(draft, { headers: { "X-AI-Mode": draft.mode } });
}

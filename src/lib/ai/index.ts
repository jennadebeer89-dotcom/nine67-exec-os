import { fmtMoney, fmtPct } from "../format";
import type { AttentionItem, ExecState } from "../engine";
import { buildContext } from "./context";
import { getOpenAI, MODEL } from "./openai";
import { DIGEST_PROMPT, EXPLAIN_PROMPT, SUMMARY_PROMPT } from "./prompts";

export type AIMode = "live" | "fallback";

// In-process cache (data is a static snapshot, so live results are stable).
const summaryCache = new Map<string, { text: string; mode: AIMode }>();
const explainCache = new Map<string, { why: string; action: string; mode: AIMode }>();

// ---------------------------------------------------------------------------
// Executive summary
// ---------------------------------------------------------------------------

export async function getExecutiveSummary(state: ExecState): Promise<{ text: string; mode: AIMode }> {
  const key = state.briefing.asOf + "|" + state.briefing.items.length;
  const cached = summaryCache.get(key);
  if (cached) return cached;

  const openai = getOpenAI();
  if (!openai) {
    const out = { text: fallbackSummary(state), mode: "fallback" as const };
    summaryCache.set(key, out);
    return out;
  }
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: SUMMARY_PROMPT },
        { role: "user", content: `SNAPSHOT:\n${buildContext(state)}\n\nWrite this week's executive summary.` },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim() || fallbackSummary(state);
    const out = { text, mode: "live" as const };
    summaryCache.set(key, out);
    return out;
  } catch {
    const out = { text: fallbackSummary(state), mode: "fallback" as const };
    summaryCache.set(key, out);
    return out;
  }
}

function fallbackSummary(state: ExecState): string {
  const items = state.briefing.items;
  const top = items.slice(0, 3);
  const rev = state.briefing.revenue;
  const dc = state.dataConfidence;
  const lead = top[0];
  const parts: string[] = [];
  if (lead) parts.push(`The priority this week is ${stripTrailingDot(lead.headline)}`);
  if (top[1]) parts.push(`Close behind, ${lowerFirst(stripTrailingDot(top[1].headline))}`);
  if (top[2]) parts.push(`also watch ${lowerFirst(stripTrailingDot(top[2].headline))}`);
  parts.push(
    `Across the quarter, ${fmtMoney(rev.atRiskTotal, { compact: true })} of ${fmtMoney(rev.committedTotal, { compact: true })} committed revenue (${fmtPct(rev.atRiskShare)}) is exposed`,
  );
  parts.push(
    `and this read sits on ${dc.level}-confidence data (${dc.counts.high + dc.counts.medium} notable gaps), so treat flagged items accordingly`,
  );
  return parts.join(". ") + ".";
}

// ---------------------------------------------------------------------------
// Per-item explanation + recommended action
// ---------------------------------------------------------------------------

export async function explainItem(item: AttentionItem, state: ExecState): Promise<{ why: string; action: string; mode: AIMode }> {
  const cached = explainCache.get(item.id);
  if (cached) return cached;

  const openai = getOpenAI();
  if (!openai) {
    const out = { ...fallbackExplain(item), mode: "fallback" as const };
    explainCache.set(item.id, out);
    return out;
  }
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXPLAIN_PROMPT },
        {
          role: "user",
          content: `SNAPSHOT (for context):\n${buildContext(state)}\n\nEXPLAIN THIS ITEM:\n${itemBlock(item)}`,
        },
      ],
    });
    const raw = res.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw) as { why?: string; action?: string };
    const fb = fallbackExplain(item);
    const out = {
      why: parsed.why?.trim() || fb.why,
      action: parsed.action?.trim() || fb.action,
      mode: "live" as const,
    };
    explainCache.set(item.id, out);
    return out;
  } catch {
    const out = { ...fallbackExplain(item), mode: "fallback" as const };
    explainCache.set(item.id, out);
    return out;
  }
}

function fallbackExplain(item: AttentionItem): { why: string; action: string } {
  const top = item.factors.slice(0, 2);
  const why =
    `${item.headline} ` +
    top.map((f) => f.detail).join(" ") +
    (item.confidenceNote ? ` (${item.confidenceNote})` : "");
  return { why: why.trim(), action: item.recommendedActionSeed };
}

// ---------------------------------------------------------------------------
// Weekly Monday-briefing email digest
// ---------------------------------------------------------------------------

export interface WeeklyDigest {
  headline: string;
  paragraph: string;
  actions: string[];
  watch: string;
  mode: AIMode;
}

const digestCache = new Map<string, WeeklyDigest>();

export async function getWeeklyDigest(state: ExecState): Promise<WeeklyDigest> {
  const key = state.briefing.asOf + "|digest";
  const cached = digestCache.get(key);
  if (cached) return cached;

  const openai = getOpenAI();
  if (!openai) {
    const out = { ...fallbackDigest(state), mode: "fallback" as const };
    digestCache.set(key, out);
    return out;
  }
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: DIGEST_PROMPT },
        { role: "user", content: `SNAPSHOT:\n${buildContext(state)}\n\nWrite the Monday Briefing email body.` },
      ],
    });
    const parsed = parseDigest(res.choices[0]?.message?.content || "");
    const fb = fallbackDigest(state);
    const out: WeeklyDigest = {
      headline: parsed.headline || fb.headline,
      paragraph: parsed.paragraph || fb.paragraph,
      actions: parsed.actions.length ? parsed.actions : fb.actions,
      watch: parsed.watch || fb.watch,
      mode: "live",
    };
    digestCache.set(key, out);
    return out;
  } catch {
    const out = { ...fallbackDigest(state), mode: "fallback" as const };
    digestCache.set(key, out);
    return out;
  }
}

function parseDigest(raw: string): { headline: string; paragraph: string; actions: string[]; watch: string } {
  const lines = raw.split("\n");
  let section = "";
  const out = { headline: "", paragraph: "", actions: [] as string[], watch: "" };
  for (const line of lines) {
    const t = line.trim();
    if (/^HEADLINE:/i.test(t)) { section = "h"; out.headline = t.replace(/^HEADLINE:/i, "").trim(); continue; }
    if (/^THE WEEK/i.test(t)) { section = "p"; out.paragraph = t.replace(/^THE WEEK.*?:/i, "").trim(); continue; }
    if (/^TOP 3 ACTIONS:/i.test(t)) { section = "a"; continue; }
    if (/^WATCH:/i.test(t)) { section = "w"; out.watch = t.replace(/^WATCH:/i, "").trim(); continue; }
    if (!t) continue;
    if (section === "p") out.paragraph += (out.paragraph ? " " : "") + t;
    else if (section === "a") out.actions.push(t.replace(/^[•\-*]\s*/, ""));
    else if (section === "w") out.watch += (out.watch ? " " : "") + t;
  }
  return out;
}

function fallbackDigest(state: ExecState): WeeklyDigest {
  const items = state.briefing.items;
  const top = items.slice(0, 3);
  return {
    headline: top[0] ? stripTrailingDot(top[0].headline) + "." : "A steady week with a few items to watch.",
    paragraph: fallbackSummary(state),
    actions: top.map((i) => `${i.title} — ${i.recommendedActionSeed}`),
    watch: state.dataConfidence.summaryLine,
    mode: "fallback",
  };
}

function itemBlock(i: AttentionItem): string {
  return [
    `Title: ${i.title} (${i.subtitle})`,
    `Kind: ${i.kind}, band: ${i.band}, score: ${i.score}/100`,
    `Headline: ${i.headline}`,
    i.confidenceNote ? `Data caveat: ${i.confidenceNote}` : "",
    `Metrics: ${i.metrics.map((m) => `${m.label}=${m.value}`).join(", ")}`,
    `Factors:`,
    ...i.factors.map((f) => `  - ${f.label}: ${f.detail}`),
    `Baseline action: ${i.recommendedActionSeed}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function stripTrailingDot(s: string) {
  return s.replace(/\.$/, "");
}
function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * AI Insight Layer — the AI-native core.
 *
 * The deterministic engine owns the NUMBERS. This layer does something a dashboard
 * fundamentally cannot: it reads the raw, messy field notes (Slack, standups, calls,
 * status emails) and reasons about what the numbers DON'T show — relationship and
 * political risk, contradictions between what's reported and what's said, team morale,
 * hidden dependencies, and shifts in sentiment.
 *
 * This is where the AI does judgment, not just language. Numbers stay deterministic;
 * this read is explicitly advisory and labelled as such in the UI.
 */
import type { ExecState } from "../engine";
import type { AttentionItem } from "../engine/types";
import type { Note } from "../types";
import { getOpenAI, MODEL } from "./openai";
import { DRAFT_PROMPT, INSIGHTS_PROMPT, ITEM_INSIGHT_PROMPT } from "./prompts";
import type { AIMode } from "./index";

export type InsightType =
  | "relationship"
  | "trust"
  | "morale"
  | "hidden-risk"
  | "contradiction"
  | "opportunity";

export interface FieldInsight {
  id: string;
  entityName: string;
  entityId: string | null; // resolved project/client id for linking, or null
  itemId: string | null; // deep link to /item/[id] when a surfaced item exists
  kind: "project" | "client" | "team" | "portfolio";
  type: InsightType;
  headline: string;
  insight: string;
  signal: string; // the field note(s) it's drawing from
  severity: "high" | "medium" | "low";
}

// ---------------------------------------------------------------------------
// Context: the field notes + a light brief of what the numbers already cover
// ---------------------------------------------------------------------------

function fieldNotesBlock(notes: Note[]): string {
  return notes
    .filter((n) => n.entityType !== "unknown")
    .map((n) => {
      const where =
        n.entityType === "team" ? `team:${n.entityId}` : n.entityId;
      return `[${n.date ?? "n/a"}] ${n.author ?? "Unknown"} (${n.channel ?? "note"}) re ${where}: "${n.text}"`;
    })
    .join("\n");
}

function rosterBlock(state: ExecState): string {
  const c = state.dataset.clients.map((x) => `${x.id} = ${x.name}`).join("; ");
  const p = state.dataset.projects.map((x) => `${x.id} = ${x.name} (client ${x.clientId ?? "?"})`).join("; ");
  return `CLIENTS: ${c}\nPROJECTS: ${p}`;
}

function numbersBrief(state: ExecState): string {
  return state.briefing.items.map((i) => `- ${i.title}: ${i.headline}`).join("\n");
}

function resolveLink(state: ExecState, entityId: string | null, kind: string) {
  if (!entityId) return { entityId: null, itemId: null };
  const known =
    state.dataset.clients.some((c) => c.id === entityId) ||
    state.dataset.projects.some((p) => p.id === entityId) ||
    kind === "team";
  const id = known ? entityId : null;
  const item = state.briefing.items.find((i) => i.refId === id);
  return { entityId: id, itemId: item?.id ?? null };
}

// ---------------------------------------------------------------------------
// Portfolio insights (homepage headline feature)
// ---------------------------------------------------------------------------

let portfolioCache: { key: string; value: { insights: FieldInsight[]; mode: AIMode } } | null = null;

export async function getPortfolioInsights(
  state: ExecState,
): Promise<{ insights: FieldInsight[]; mode: AIMode }> {
  const key = state.briefing.asOf;
  if (portfolioCache?.key === key) return portfolioCache.value;

  const openai = getOpenAI();
  if (!openai) {
    const value = { insights: fallbackInsights(state), mode: "fallback" as const };
    portfolioCache = { key, value };
    return value;
  }

  try {
    const content =
      `ROSTER (use these exact ids for entityId):\n${rosterBlock(state)}\n\n` +
      `WHAT THE NUMBERS ALREADY FLAG (do not just repeat these):\n${numbersBrief(state)}\n\n` +
      `FIELD NOTES (the raw, messy human signal — your job is to read between the lines):\n${fieldNotesBlock(state.dataset.notes)}`;

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INSIGHTS_PROMPT },
        { role: "user", content },
      ],
    });
    const raw = res.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw) as { insights?: Partial<FieldInsight>[] };
    const insights = (parsed.insights ?? []).slice(0, 6).map((x, i) => {
      const kind = (["project", "client", "team", "portfolio"].includes(x.kind as string) ? x.kind : "portfolio") as FieldInsight["kind"];
      const { entityId, itemId } = resolveLink(state, x.entityId ?? null, kind);
      return {
        id: `ins${i + 1}`,
        entityName: x.entityName ?? "Portfolio",
        entityId,
        itemId,
        kind,
        type: (x.type as InsightType) ?? "hidden-risk",
        headline: x.headline ?? "",
        insight: x.insight ?? "",
        signal: x.signal ?? "",
        severity: (["high", "medium", "low"].includes(x.severity as string) ? x.severity : "medium") as FieldInsight["severity"],
      } satisfies FieldInsight;
    }).filter((x) => x.headline && x.insight);

    const value = { insights: insights.length ? insights : fallbackInsights(state), mode: "live" as const };
    portfolioCache = { key, value };
    return value;
  } catch {
    const value = { insights: fallbackInsights(state), mode: "fallback" as const };
    portfolioCache = { key, value };
    return value;
  }
}

// ---------------------------------------------------------------------------
// Per-item field read (drill-down)
// ---------------------------------------------------------------------------

const itemInsightCache = new Map<string, { read: string; mode: AIMode }>();

export async function getItemInsight(item: AttentionItem, state: ExecState): Promise<{ read: string; mode: AIMode }> {
  const cached = itemInsightCache.get(item.id);
  if (cached) return cached;

  const notes = notesForItem(item, state);
  if (notes.length === 0) {
    const v = { read: "No field notes on file for this item.", mode: "fallback" as const };
    itemInsightCache.set(item.id, v);
    return v;
  }

  const openai = getOpenAI();
  if (!openai) {
    const v = { read: fallbackItemRead(notes), mode: "fallback" as const };
    itemInsightCache.set(item.id, v);
    return v;
  }
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      messages: [
        { role: "system", content: ITEM_INSIGHT_PROMPT },
        {
          role: "user",
          content: `ITEM: ${item.title} (${item.subtitle})\nWHAT THE NUMBERS SAY: ${item.headline}\n\nFIELD NOTES:\n${fieldNotesBlock(notes)}\n\nWrite the field read.`,
        },
      ],
    });
    const read = res.choices[0]?.message?.content?.trim() || fallbackItemRead(notes);
    const v = { read, mode: "live" as const };
    itemInsightCache.set(item.id, v);
    return v;
  } catch {
    const v = { read: fallbackItemRead(notes), mode: "fallback" as const };
    itemInsightCache.set(item.id, v);
    return v;
  }
}

export function notesForItem(item: AttentionItem, state: ExecState): Note[] {
  const ids = new Set<string>();
  if (item.kind === "project") {
    ids.add(item.refId);
    const p = state.dataset.projects.find((x) => x.id === item.refId);
    if (p?.clientId) ids.add(p.clientId);
  } else if (item.kind === "client") {
    ids.add(item.refId);
    state.dataset.projects.filter((p) => p.clientId === item.refId).forEach((p) => ids.add(p.id));
  } else if (item.kind === "capacity") {
    ids.add(item.refId); // team name
    ids.add(`team:${item.refId}`);
  }
  return state.dataset.notes
    .filter((n) => ids.has(n.entityId) || ids.has(`team:${n.entityId}`))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

// ---------------------------------------------------------------------------
// Deterministic fallbacks (no key) — clearly weaker, but never a dead end
// ---------------------------------------------------------------------------

const CONCERN = [
  "concern", "quiet", "went dark", "champion left", "evaluating", "competitor",
  "no change order", "scope grew", "stretched", "over 100", "late", "paused",
  "coin flip", "unrealistic", "blocked", "single point", "context-switching", "morale",
];

function fallbackInsights(state: ExecState): FieldInsight[] {
  const notes = state.dataset.notes.filter((n) => {
    const t = n.text.toLowerCase();
    return n.entityType !== "unknown" && CONCERN.some((c) => t.includes(c));
  });
  // one insight per entity, most concerning first
  const seen = new Set<string>();
  const out: FieldInsight[] = [];
  for (const n of notes) {
    if (seen.has(n.entityId)) continue;
    seen.add(n.entityId);
    const kind: FieldInsight["kind"] = n.entityType === "team" ? "team" : n.entityType === "client" ? "client" : "project";
    const name =
      kind === "client"
        ? state.dataset.clients.find((c) => c.id === n.entityId)?.name
        : kind === "project"
          ? state.dataset.projects.find((p) => p.id === n.entityId)?.name
          : `${n.entityId} team`;
    const { entityId, itemId } = resolveLink(state, n.entityType === "team" ? null : n.entityId, kind);
    out.push({
      id: `ins${out.length + 1}`,
      entityName: name ?? n.entityId,
      entityId,
      itemId,
      kind,
      type: "relationship",
      headline: `Signal from the field: ${name ?? n.entityId}`,
      insight: `A recent field note flags something the metrics may not capture: "${truncate(n.text, 120)}"`,
      signal: `${n.author ?? "Unknown"} · ${n.channel ?? "note"}${n.date ? ` · ${n.date}` : ""}`,
      severity: "medium",
    });
    if (out.length >= 5) break;
  }
  return out;
}

function fallbackItemRead(notes: Note[]): string {
  const concern = notes.find((n) => CONCERN.some((c) => n.text.toLowerCase().includes(c)));
  const top = concern ?? notes[0];
  return `From the field notes: "${top.text}" — ${top.author ?? "Unknown"}, ${top.channel ?? "note"}${top.date ? `, ${top.date}` : ""}. (Connect a model key for a fuller read of the qualitative signal.)`;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

// ---------------------------------------------------------------------------
// AI-drafted outreach (generative artifact, on-demand)
// ---------------------------------------------------------------------------

export interface DraftedOutreach {
  channel: string;
  to: string;
  subject: string;
  body: string;
  mode: AIMode;
}

export async function draftOutreach(item: AttentionItem, state: ExecState): Promise<DraftedOutreach> {
  const notes = notesForItem(item, state);
  const openai = getOpenAI();
  if (!openai) return fallbackDraft(item);
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DRAFT_PROMPT },
        {
          role: "user",
          content:
            `SITUATION: ${item.title} (${item.subtitle})\n` +
            `THE ISSUE: ${item.headline}\n` +
            `RECOMMENDED ACTION: ${item.recommendedActionSeed}\n` +
            `FIELD NOTES:\n${fieldNotesBlock(notes)}\n\nDraft the outreach.`,
        },
      ],
    });
    const raw = res.choices[0]?.message?.content?.trim() || "{}";
    const p = JSON.parse(raw) as Partial<DraftedOutreach>;
    return {
      channel: p.channel || "Email",
      to: p.to || "—",
      subject: p.subject || "",
      body: p.body || fallbackDraft(item).body,
      mode: "live",
    };
  } catch {
    return fallbackDraft(item);
  }
}

function fallbackDraft(item: AttentionItem): DraftedOutreach {
  const internal = item.kind === "capacity";
  return {
    channel: internal ? "Slack" : "Email",
    to: internal ? "Delivery leads" : "Client sponsor",
    subject: internal ? "" : `Quick note on ${item.title}`,
    body:
      `${item.recommendedActionSeed}\n\n` +
      `(Connect a model key to generate a fully drafted, situation-specific message.)`,
    mode: "fallback",
  };
}

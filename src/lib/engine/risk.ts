import { THRESHOLDS } from "../config";
import { fmtMoney, fmtPctWhole } from "../format";
import type { Client, Dataset, Project, RiskBand } from "../types";
import {
  noteEvidence,
  relatedNotes,
  scoreSentiment,
  topConcernNote,
} from "./signals";
import type { Evidence, Metric, RiskFactor } from "./types";

export interface RiskResult {
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
  metrics: Metric[];
  headline: string;
  recommendedActionSeed: string;
  confidenceNote?: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function scoreToBand(score: number): RiskBand {
  if (score >= 60) return "high";
  if (score >= 38) return "medium";
  if (score >= 20) return "watch";
  return "low";
}

// ---------------------------------------------------------------------------
// Project risk
// ---------------------------------------------------------------------------

export function scoreProject(p: Project, ds: Dataset): RiskResult {
  const factors: RiskFactor[] = [];
  const notes = relatedNotes(ds.notes, {
    projectIds: [p.id],
    clientId: p.clientId ?? undefined,
  });

  const burn = p.burnRatio;
  const delivery = p.percentComplete;

  // Budget burning ahead of delivery
  if (burn !== null && delivery !== null) {
    const gap = burn - delivery / 100;
    if (gap >= THRESHOLDS.burnAheadOfDeliveryGap) {
      const ev: Evidence[] = [
        { kind: "metric", label: "Budget consumed", detail: fmtPctWhole(burn * 100) },
        { kind: "metric", label: "Delivery reported", detail: fmtPctWhole(delivery) },
      ];
      if (p.budgetSources.length) {
        ev.push({
          kind: "budget",
          label: "Spend vs budget",
          detail: `${fmtMoney(p.spentWorstCase)} of ${fmtMoney(p.budget)}`,
        });
      }
      factors.push({
        kind: "budget",
        label: `${fmtPctWhole(burn * 100)} of budget spent at ${fmtPctWhole(delivery)} delivered`,
        detail:
          "Spend is running well ahead of delivered work — the remaining scope has to be completed on a thin slice of remaining budget.",
        weight: clamp(gap * 120, 8, 36),
        evidence: ev,
      });
    }
  }

  // Over / near budget (absolute)
  if (burn !== null && burn > 1) {
    factors.push({
      kind: "budget",
      label: `Over budget by ${fmtPctWhole((burn - 1) * 100)}`,
      detail: `Spend (${fmtMoney(p.spentWorstCase)}) has exceeded the budget (${fmtMoney(p.budget)}).`,
      weight: clamp(18 + (burn - 1) * 100, 18, 34),
      evidence: [{ kind: "budget", label: "Spend vs budget", detail: `${fmtMoney(p.spentWorstCase)} of ${fmtMoney(p.budget)}` }],
    });
  } else if (burn !== null && burn >= THRESHOLDS.budgetCriticalRatio) {
    factors.push({
      kind: "budget",
      label: `Budget ${fmtPctWhole(burn * 100)} consumed`,
      detail: "Almost no budget headroom remains.",
      weight: 14,
      evidence: [{ kind: "budget", label: "Spend vs budget", detail: `${fmtMoney(p.spentWorstCase)} of ${fmtMoney(p.budget)}` }],
    });
  }

  // Timeline pressure
  if (p.dueInDays !== null && delivery !== null) {
    if (p.dueInDays < 0) {
      factors.push({
        kind: "timeline",
        label: `${Math.abs(p.dueInDays)} days overdue at ${fmtPctWhole(delivery)}`,
        detail: "The target delivery date has passed and the project isn't complete.",
        weight: clamp(16 + Math.abs(p.dueInDays) / 3, 16, 30),
        evidence: [{ kind: "metric", label: "Due", detail: p.due ?? "—" }],
      });
    } else if (p.dueInDays <= 30 && delivery < 80) {
      factors.push({
        kind: "timeline",
        label: `Due in ${p.dueInDays} days at ${fmtPctWhole(delivery)} complete`,
        detail: "Limited time remains relative to the work still outstanding.",
        weight: clamp(((30 - p.dueInDays) / 30) * 16 + (80 - delivery) / 4, 6, 28),
        evidence: [{ kind: "metric", label: "Due", detail: p.due ?? "—" }],
      });
    }
  }

  // Stale record
  if (p.daysSinceUpdate !== null && p.daysSinceUpdate > THRESHOLDS.staleDays && p.status !== "complete") {
    factors.push({
      kind: "stale",
      label: `No update in ${p.daysSinceUpdate} days`,
      detail: "The status is old enough that the reported numbers may no longer be true.",
      weight: clamp((p.daysSinceUpdate - THRESHOLDS.staleDays) / 2 + 6, 6, 18),
      evidence: [{ kind: "metric", label: "Last update", detail: p.lastUpdate ?? "—" }],
    });
  }

  // Ambiguous / paused status
  if (p.status === "paused") {
    factors.push({
      kind: "timeline",
      label: "Status reads as paused",
      detail: "Delivery may be stalled — and if it's paused, forecasted revenue is in question.",
      weight: 12,
      evidence: [{ kind: "metric", label: "Status", detail: p.statusRaw ?? "—" }],
    });
  } else if (p.statusAmbiguous) {
    factors.push({
      kind: "data",
      label: `Status "${p.statusRaw}" is unclear`,
      detail: "The recorded status isn't a clean state, so the real position is uncertain.",
      weight: 8,
      evidence: [{ kind: "metric", label: "Status", detail: p.statusRaw ?? "—" }],
    });
  }

  // Budget conflict
  if (p.hasBudgetConflict) {
    const detail = p.budgetSources
      .filter((s) => s.spent !== null)
      .map((s) => `${s.source}: ${fmtMoney(s.spent)}`)
      .join(" vs ");
    factors.push({
      kind: "data",
      label: "Finance and delivery disagree on spend",
      detail: `Conflicting spend figures (${detail}) mean we don't actually know the margin on this build.`,
      weight: 14,
      evidence: [{ kind: "conflict", label: "Conflicting spend", detail }],
    });
  }

  // Missing budget entirely (couldn't recover)
  if (p.budget === null) {
    factors.push({
      kind: "data",
      label: "No budget on file",
      detail: "Without a budget we can't assess margin or burn for this project.",
      weight: 8,
      evidence: [{ kind: "metric", label: "Budget", detail: "missing" }],
    });
  }

  // Note sentiment
  const sent = scoreSentiment(notes);
  if (sent.negativeCount > 0) {
    const concern = topConcernNote(notes);
    factors.push({
      kind: "sentiment",
      label: concern
        ? `Concern flagged: "${truncate(concern.text, 60)}"`
        : `${sent.negativeCount} concern signals in recent updates`,
      detail: "The qualitative status updates carry warning signals the numbers alone wouldn't show.",
      weight: clamp(Math.round(-sent.score * 8 + sent.negativeCount * 2), 0, 16),
      evidence: notes.slice(0, 3).map(noteEvidence),
    });
  }

  const score = clamp(Math.round(factors.reduce((s, f) => s + f.weight, 0)), 0, 100);
  const band = scoreToBand(score);
  const metrics = projectMetrics(p);
  const headline = buildProjectHeadline(p, factors);
  const recommendedActionSeed = recommendForProject(p, factors);
  const confidenceNote = p.hasBudgetConflict
    ? "Spend figures conflict between sources — read with caution."
    : p.daysSinceUpdate && p.daysSinceUpdate > 30
      ? "Status is stale; the position may have moved."
      : undefined;

  return { score, band, factors: sortFactors(factors), metrics, headline, recommendedActionSeed, confidenceNote };
}

// ---------------------------------------------------------------------------
// Client risk
// ---------------------------------------------------------------------------

export function scoreClient(c: Client, ds: Dataset, projectScores: Map<string, RiskResult>): RiskResult {
  const factors: RiskFactor[] = [];
  const projects = ds.projects.filter((p) => p.clientId === c.id);
  const notes = relatedNotes(ds.notes, {
    clientId: c.id,
    projectIds: projects.map((p) => p.id),
  });
  const sent = scoreSentiment(notes);

  // Renewal proximity (+ churn sentiment)
  if (c.renewalInDays !== null && c.renewalInDays >= 0) {
    if (c.renewalInDays <= THRESHOLDS.renewalUrgentDays) {
      const churny = /competitor|evaluating|alternativ|coin flip|champion left|non-committal/i;
      const churnNote = notes.find((n) => churny.test(n.text));
      factors.push({
        kind: "renewal",
        label: `Renewal in ${c.renewalInDays} days${churnNote ? " with active churn signals" : ""}`,
        detail: churnNote
          ? "The contract is up for renewal soon and the account is showing churn signals."
          : "The contract renews within the urgent window and needs a retention plan.",
        weight: churnNote ? 36 : 20,
        evidence: churnNote ? [noteEvidence(churnNote)] : [{ kind: "metric", label: "Renewal", detail: c.renewalDate ?? "—" }],
      });
    } else if (c.renewalInDays <= THRESHOLDS.renewalSoonDays) {
      factors.push({
        kind: "renewal",
        label: `Renewal in ${c.renewalInDays} days`,
        detail: "Renewal is approaching — worth a proactive check-in.",
        weight: 10,
        evidence: [{ kind: "metric", label: "Renewal", detail: c.renewalDate ?? "—" }],
      });
    }
  }

  // Silent client
  if (c.daysSinceContact !== null && c.daysSinceContact > THRESHOLDS.silentClientDays) {
    factors.push({
      kind: "sentiment",
      label: `No contact in ${c.daysSinceContact} days`,
      detail: c.sentimentNote
        ? "The account has gone quiet — silence on a live account is itself a signal."
        : "The account has gone quiet and there's no recent qualitative read on it — a blind spot.",
      weight: clamp((c.daysSinceContact - THRESHOLDS.silentClientDays) / 2 + 8, 8, 20),
      evidence: [{ kind: "metric", label: "Last contact", detail: c.lastContact ?? "—" }],
    });
  }

  // Health flag
  if (c.health === "red") {
    factors.push({
      kind: "sentiment",
      label: "Account health flagged red",
      detail: "The account team has marked this relationship as at risk.",
      weight: 14,
      evidence: [{ kind: "metric", label: "Health", detail: c.healthRaw ?? "—" }],
    });
  } else if (c.health === "amber") {
    factors.push({
      kind: "sentiment",
      label: "Account health flagged amber",
      detail: "The account team has the relationship on watch.",
      weight: 8,
      evidence: [{ kind: "metric", label: "Health", detail: c.healthRaw ?? "—" }],
    });
  }

  // Cash / payment risk
  const payRe = /late|invoice|paying|payment|days late/i;
  const payNote = notes.find((n) => payRe.test(n.text));
  if (payNote) {
    factors.push({
      kind: "payment",
      label: "Late payments flagged",
      detail: "Delivery may be fine, but the account is behind on payment — a cash and relationship risk.",
      weight: 14,
      evidence: [noteEvidence(payNote)],
    });
  }

  // Inherit underlying delivery risk
  let worstProject: { p: Project; r: RiskResult } | null = null;
  for (const p of projects) {
    const r = projectScores.get(p.id);
    if (r && (!worstProject || r.score > worstProject.r.score)) worstProject = { p, r };
  }
  if (worstProject && worstProject.r.score >= 40) {
    factors.push({
      kind: "delivery",
      label: `Delivery risk on ${worstProject.p.name}`,
      detail: "An at-risk engagement under this account compounds the relationship risk.",
      weight: clamp((worstProject.r.score - 40) / 3, 4, 14),
      evidence: [{ kind: "metric", label: worstProject.p.name, detail: `risk ${worstProject.r.score}/100` }],
    });
  }

  const score = clamp(Math.round(factors.reduce((s, f) => s + f.weight, 0)), 0, 100);
  const band = scoreToBand(score);
  const metrics = clientMetrics(c);
  const headline = buildClientHeadline(c, factors);
  const recommendedActionSeed = recommendForClient(c, factors);
  const confidenceNote =
    !c.sentimentNote && (c.daysSinceContact ?? 0) > THRESHOLDS.silentClientDays
      ? "No recent qualitative read on this account — risk may be understated."
      : undefined;

  return { score, band, factors: sortFactors(factors), metrics, headline, recommendedActionSeed, confidenceNote };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortFactors(f: RiskFactor[]) {
  return [...f].sort((a, b) => b.weight - a.weight);
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

function projectMetrics(p: Project): Metric[] {
  const burnTone =
    p.burnRatio === null ? "neutral" : p.burnRatio > 1 ? "bad" : p.burnRatio >= THRESHOLDS.budgetWarnRatio ? "warn" : "ok";
  return [
    {
      label: "Budget",
      value: p.hasBudgetConflict ? "conflict" : `${fmtMoney(p.spentWorstCase, { compact: true })} / ${fmtMoney(p.budget, { compact: true })}`,
      tone: p.hasBudgetConflict ? "warn" : (burnTone as Metric["tone"]),
    },
    { label: "Delivery", value: fmtPctWhole(p.percentComplete), tone: "neutral" },
    {
      label: "Due",
      value: p.due ?? "—",
      tone: p.dueInDays !== null && p.dueInDays < 0 ? "bad" : p.dueInDays !== null && p.dueInDays <= 30 ? "warn" : "neutral",
    },
    {
      label: "Last update",
      value: p.daysSinceUpdate !== null ? `${p.daysSinceUpdate}d ago` : "—",
      tone: p.daysSinceUpdate !== null && p.daysSinceUpdate > THRESHOLDS.staleDays ? "warn" : "neutral",
    },
  ];
}

function clientMetrics(c: Client): Metric[] {
  return [
    { label: "Contract value", value: fmtMoney(c.contractValue, { compact: true }), tone: "neutral" },
    {
      label: "Renewal",
      value: c.renewalDate ?? (c.healthRaw === undefined ? "—" : "unknown"),
      tone: c.renewalInDays !== null && c.renewalInDays <= THRESHOLDS.renewalUrgentDays ? "warn" : "neutral",
    },
    {
      label: "Last contact",
      value: c.daysSinceContact !== null ? `${c.daysSinceContact}d ago` : "—",
      tone: c.daysSinceContact !== null && c.daysSinceContact > THRESHOLDS.silentClientDays ? "warn" : "neutral",
    },
    { label: "Health", value: c.healthRaw?.trim() || "blank", tone: c.health === "red" ? "bad" : c.health === "amber" ? "warn" : "neutral" },
  ];
}

function buildProjectHeadline(p: Project, factors: RiskFactor[]): string {
  if (!factors.length) return `${p.name} is tracking without notable risk signals.`;
  const top = factors[0];
  return `${p.name}: ${top.label.toLowerCase()}.`;
}

function buildClientHeadline(c: Client, factors: RiskFactor[]): string {
  if (!factors.length) return `${c.name} looks healthy.`;
  const top = factors[0];
  return `${c.name}: ${top.label.toLowerCase()}.`;
}

function recommendForProject(p: Project, factors: RiskFactor[]): string {
  const kinds = new Set(factors.map((f) => f.kind));
  if (kinds.has("data") && p.hasBudgetConflict)
    return "Reconcile spend between finance and delivery before reporting a margin number on this build.";
  if (p.status === "paused")
    return "Confirm whether this engagement is paused or dead, and stop forecasting its revenue until you know.";
  if (kinds.has("budget"))
    return "Run a scope-and-margin review and agree a recovery plan with the client this week.";
  if (kinds.has("timeline"))
    return "Re-baseline the delivery date and proactively brief the client before they ask.";
  if (kinds.has("stale"))
    return `Get a fresh status from the delivery lead — this hasn't moved in ${p.daysSinceUpdate} days.`;
  return "Have the delivery lead confirm the current position and any client concerns.";
}

function recommendForClient(c: Client, factors: RiskFactor[]): string {
  const kinds = new Set(factors.map((f) => f.kind));
  if (kinds.has("renewal")) return "Stand up a retention plan and get an executive sponsor on a call before renewal.";
  if (kinds.has("payment")) return "Have the relationship lead raise the overdue invoices directly — don't let finance chase alone.";
  if (kinds.has("sentiment") && c.daysSinceContact && c.daysSinceContact > THRESHOLDS.silentClientDays)
    return "Re-establish contact this week and log an honest read on where the relationship stands.";
  return "Schedule an account review to confirm health and surface anything unspoken.";
}

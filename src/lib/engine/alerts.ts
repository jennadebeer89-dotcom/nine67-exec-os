import { THRESHOLDS } from "../config";
import { fmtMoney, fmtPct, fmtPctWhole } from "../format";
import type { Dataset } from "../types";
import type { Briefing, TrendReport } from "./types";

/**
 * Alerts engine. Threshold-based rules evaluated over the current state and the
 * week's trends. This is the "push" layer — what a system would proactively flag,
 * as opposed to the briefing's "pull" ranking. Every alert names the rule that
 * fired and links to the underlying item where one exists.
 */
export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "budget" | "client" | "capacity" | "revenue" | "data" | "trend";
  title: string;
  detail: string;
  refId?: string;
  itemId?: string; // deep link to /item/[id] when the entity is a surfaced item
  rule: string; // the threshold that fired
}

export function buildAlerts(ds: Dataset, briefing: Briefing, trends: TrendReport): Alert[] {
  const alerts: Alert[] = [];
  const itemFor = (kind: string, refId: string) =>
    briefing.items.find((i) => i.kind === kind && i.refId === refId)?.id;
  let n = 0;
  const push = (a: Omit<Alert, "id">) => alerts.push({ id: `al${++n}`, ...a });

  // --- Budget ---
  for (const p of ds.projects) {
    const itemId = itemFor("project", p.id);
    if (p.burnRatio !== null && p.burnRatio > 1) {
      push({
        severity: "critical", category: "budget", rule: "Spend exceeds budget",
        title: `${p.name} is over budget`,
        detail: `${fmtPctWhole(p.burnRatio * 100)} of budget consumed at ${fmtPctWhole(p.percentComplete)} delivery.`,
        refId: p.id, itemId,
      });
    } else if (p.burnRatio !== null && p.burnRatio >= THRESHOLDS.budgetCriticalRatio) {
      push({
        severity: "critical", category: "budget", rule: "Budget burn ≥ 95%",
        title: `${p.name} has nearly exhausted its budget`,
        detail: `${fmtPctWhole(p.burnRatio * 100)} consumed at ${fmtPctWhole(p.percentComplete)} delivery.`,
        refId: p.id, itemId,
      });
    } else if (
      p.burnRatio !== null &&
      p.burnRatio >= THRESHOLDS.budgetWarnRatio &&
      p.percentComplete !== null &&
      p.burnRatio * 100 - p.percentComplete > 5 // only when burn runs AHEAD of delivery
    ) {
      push({
        severity: "warning", category: "budget", rule: "Burn ≥ 85% and ahead of delivery",
        title: `${p.name} is burning budget ahead of delivery`,
        detail: `${fmtPctWhole(p.burnRatio * 100)} consumed at ${fmtPctWhole(p.percentComplete)} delivery.`,
        refId: p.id, itemId,
      });
    }
    if (p.hasBudgetConflict) {
      push({
        severity: "warning", category: "data", rule: "Conflicting spend figures",
        title: `${p.name}: finance and delivery disagree on spend`,
        detail: "Reconcile before reporting a margin number.",
        refId: p.id, itemId,
      });
    }
  }

  // --- Clients ---
  for (const c of ds.clients) {
    const itemId = itemFor("client", c.id);
    if (c.renewalInDays !== null && c.renewalInDays >= 0 && c.renewalInDays <= THRESHOLDS.renewalUrgentDays) {
      push({
        severity: "critical", category: "client", rule: `Renewal ≤ ${THRESHOLDS.renewalUrgentDays} days`,
        title: `${c.name} renews in ${c.renewalInDays} days`,
        detail: `${fmtMoney(c.contractValue, { compact: true })}/yr account in the urgent renewal window.`,
        refId: c.id, itemId,
      });
    }
    if (c.daysSinceContact !== null && c.daysSinceContact > THRESHOLDS.silentClientDays) {
      push({
        severity: "warning", category: "client", rule: `No contact > ${THRESHOLDS.silentClientDays} days`,
        title: `${c.name} has gone quiet`,
        detail: `No logged contact in ${c.daysSinceContact} days.`,
        refId: c.id, itemId,
      });
    }
  }

  // --- Capacity ---
  for (const t of briefing.capacity.teams) {
    const itemId = itemFor("capacity", t.team);
    if (t.utilization !== null && t.utilization > 1) {
      push({
        severity: "critical", category: "capacity", rule: "Team utilization > 100%",
        title: `${t.team} team is over capacity`,
        detail: `Running at ${fmtPct(t.utilization)} with ${t.overAllocated.length} people over 100%.`,
        refId: t.team, itemId,
      });
    }
    for (const person of t.overAllocated) {
      if (person.utilization !== null && person.utilization >= 1.15) {
        push({
          severity: "warning", category: "capacity", rule: "Individual utilization ≥ 115%",
          title: `${person.name} is over-allocated`,
          detail: `${person.allocatedHours}h booked vs ${person.capacity}h capacity (${fmtPct(person.utilization)}).`,
          refId: t.team, itemId,
        });
      }
    }
  }

  // --- Revenue ---
  if (briefing.revenue.atRiskShare > 0.4) {
    push({
      severity: "warning", category: "revenue", rule: "Revenue at risk > 40%",
      title: `${fmtPct(briefing.revenue.atRiskShare)} of quarter revenue is at risk`,
      detail: `${fmtMoney(briefing.revenue.atRiskTotal, { compact: true })} of ${fmtMoney(briefing.revenue.committedTotal, { compact: true })} committed.`,
      refId: briefing.revenue.quarter, itemId: itemFor("revenue", briefing.revenue.quarter),
    });
  }

  // --- Trend-triggered (week-over-week) ---
  for (const m of trends.movers.filter((x) => x.direction === "worse").slice(0, 4)) {
    push({
      severity: "info", category: "trend", rule: "Notable change this week",
      title: `${m.title} worsened this week`,
      detail: `${m.summary} (${m.deltaText})`,
      refId: m.refId,
      itemId: m.kind && m.refId ? itemFor(m.kind, m.refId) : undefined,
    });
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function alertCounts(alerts: Alert[]) {
  return {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
    total: alerts.length,
  };
}

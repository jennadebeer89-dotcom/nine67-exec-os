import { CURRENT_QUARTER } from "../config";
import type { Dataset } from "../types";
import type { RevenueLine, RevenueReport } from "./types";
import type { RiskResult } from "./risk";

/**
 * Revenue engine. Reasons about committed-vs-at-risk revenue for the current
 * quarter. "At risk" is derived deterministically from the project's state and
 * the forecast note, each line carrying an explicit reason and risk type.
 *
 * Cash-collection risk (client paying late) is surfaced but kept OUT of the
 * revenue-recognition total — it's an AR problem, not a delivery one.
 */
export function buildRevenue(ds: Dataset, projectScores: Map<string, RiskResult>): RevenueReport {
  const projectById = new Map(ds.projects.map((p) => [p.id, p]));
  const clientById = new Map(ds.clients.map((c) => [c.id, c]));

  const lines: RevenueLine[] = ds.forecasts
    .filter((f) => !f.quarter || f.quarter === CURRENT_QUARTER)
    .map((f) => {
      const p = f.projectId ? projectById.get(f.projectId) : undefined;
      const c = f.clientId ? clientById.get(f.clientId) : undefined;
      const note = (f.note ?? "").toLowerCase();

      let atRisk = false;
      let riskReason: string | null = null;
      let riskType: RevenueLine["riskType"] = null;

      if (p?.status === "paused" || note.includes("paused")) {
        atRisk = true;
        riskType = "delivery";
        riskReason = "The project may be paused — this revenue shouldn't be counted until that's confirmed.";
      } else if (p?.hasBudgetConflict || note.includes("reconcil")) {
        atRisk = true;
        riskType = "data";
        riskReason = "Budget reconciliation is unresolved, so the recognized figure is uncertain.";
      } else if (note.includes("slip") || note.includes("q3")) {
        atRisk = true;
        riskType = "timing";
        riskReason = "The delivery milestone is slipping out of the quarter into Q3.";
      } else if (note.includes("renewal") || note.includes("champion")) {
        atRisk = true;
        riskType = "renewal";
        riskReason = "Contingent on a renewal that is currently at risk.";
      } else if (note.includes("late") || note.includes("cash")) {
        atRisk = true;
        riskType = "cash";
        riskReason = "Delivery is on track, but the cash is at risk — the client is paying late.";
      } else if (f.confidence === "low") {
        atRisk = true;
        riskType = "delivery";
        riskReason = "Forecast confidence is low and margin is under pressure.";
      }

      return {
        projectId: f.projectId,
        clientId: f.clientId,
        projectName: p?.name ?? f.projectId ?? "Unknown",
        clientName: c?.name ?? p?.clientName ?? "—",
        committed: f.committed ?? 0,
        recognized: f.recognized ?? 0,
        atRisk,
        riskReason,
        riskType,
      };
    });

  const committedTotal = lines.reduce((s, l) => s + l.committed, 0);
  const recognizedTotal = lines.reduce((s, l) => s + l.recognized, 0);
  // Recognition risk excludes pure cash/AR lines.
  const atRiskTotal = lines
    .filter((l) => l.atRisk && l.riskType !== "cash")
    .reduce((s, l) => s + l.committed, 0);

  return {
    quarter: CURRENT_QUARTER,
    committedTotal,
    recognizedTotal,
    atRiskTotal,
    atRiskShare: committedTotal > 0 ? atRiskTotal / committedTotal : 0,
    lines: lines.sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || b.committed - a.committed),
  };
}

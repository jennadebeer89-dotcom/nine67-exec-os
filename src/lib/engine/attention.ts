import { fmtMoney, fmtPct, fmtPctWhole } from "../format";
import type { Dataset } from "../types";
import { buildCapacity } from "./capacity";
import { buildRevenue } from "./revenue";
import { scoreClient, scoreProject, scoreToBand, type RiskResult } from "./risk";
import type { AttentionItem, Briefing, RiskFactor, TeamLoad } from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function buildBriefing(ds: Dataset): Briefing {
  // 1. Score every project, then every client (clients inherit project risk).
  const projectScores = new Map<string, RiskResult>();
  for (const p of ds.projects) projectScores.set(p.id, scoreProject(p, ds));
  const clientScores = new Map<string, RiskResult>();
  for (const c of ds.clients) clientScores.set(c.id, scoreClient(c, ds, projectScores));

  const capacity = buildCapacity(ds);
  const revenue = buildRevenue(ds, projectScores);

  const items: AttentionItem[] = [];

  // 2. Project items (watch and above)
  for (const p of ds.projects) {
    const r = projectScores.get(p.id)!;
    if (r.score < 20 || r.factors.length === 0) continue;
    items.push({
      id: `prj-${p.id}`,
      kind: "project",
      refId: p.id,
      title: p.name,
      subtitle: p.clientName ?? "—",
      band: r.band,
      score: r.score,
      headline: r.headline,
      factors: r.factors,
      metrics: r.metrics,
      recommendedActionSeed: r.recommendedActionSeed,
      confidenceNote: r.confidenceNote,
    });
  }

  // 3. Client items (only when the client risk adds something beyond its projects)
  for (const c of ds.clients) {
    const r = clientScores.get(c.id)!;
    if (r.score < 30 || r.factors.length === 0) continue;
    // Skip pure pass-through: if the ONLY factor is inherited delivery risk, the
    // project item already covers it.
    if (r.factors.length === 1 && r.factors[0].kind === "delivery") continue;
    items.push({
      id: `cli-${c.id}`,
      kind: "client",
      refId: c.id,
      title: c.name,
      subtitle: `${c.industry ?? "Client"} · ${fmtMoney(c.contractValue, { compact: true })}/yr`,
      band: r.band,
      score: r.score,
      headline: r.headline,
      factors: r.factors,
      metrics: r.metrics,
      recommendedActionSeed: r.recommendedActionSeed,
      confidenceNote: r.confidenceNote,
    });
  }

  // 4. Capacity items (one per stretched team)
  for (const t of capacity.teams) {
    if (t.overAllocated.length === 0 && t.unknownCapacity.length === 0) continue;
    if (t.overAllocated.length === 0) continue; // unknown-only handled in Data Confidence
    items.push(capacityItem(t));
  }

  // 5. Revenue item (aggregate)
  if (revenue.atRiskTotal > 0) {
    const score = clamp(Math.round(revenue.atRiskShare * 90 + (revenue.atRiskTotal >= 750_000 ? 20 : 0)), 0, 100);
    const atRiskLines = revenue.lines.filter((l) => l.atRisk && l.riskType !== "cash");
    const factors: RiskFactor[] = atRiskLines.slice(0, 6).map((l) => ({
      kind: l.riskType === "timing" ? "timeline" : l.riskType === "renewal" ? "renewal" : l.riskType === "data" ? "data" : "delivery",
      label: `${l.projectName} — ${fmtMoney(l.committed, { compact: true })} at risk`,
      detail: l.riskReason ?? "At risk.",
      weight: l.committed / 1000,
      evidence: [{ kind: "forecast", label: l.projectName, detail: `${fmtMoney(l.committed)} committed, ${fmtMoney(l.recognized)} recognized` }],
    }));
    const cashLine = revenue.lines.find((l) => l.riskType === "cash");
    if (cashLine) {
      factors.push({
        kind: "payment",
        label: `Cash risk: ${cashLine.clientName} paying late`,
        detail: cashLine.riskReason ?? "Cash at risk.",
        weight: 1,
        evidence: [{ kind: "forecast", label: cashLine.clientName, detail: `${fmtMoney(cashLine.committed)} committed` }],
      });
    }
    items.push({
      id: "rev-q",
      kind: "revenue",
      refId: revenue.quarter,
      title: `Revenue at risk — ${revenue.quarter}`,
      subtitle: `${fmtMoney(revenue.atRiskTotal, { compact: true })} of ${fmtMoney(revenue.committedTotal, { compact: true })} committed`,
      band: scoreToBand(score),
      score,
      headline: `${fmtMoney(revenue.atRiskTotal, { compact: true })} of this quarter's ${fmtMoney(revenue.committedTotal, { compact: true })} committed revenue (${fmtPct(revenue.atRiskShare)}) carries delivery, timing, or renewal risk.`,
      factors,
      metrics: [
        { label: "Committed", value: fmtMoney(revenue.committedTotal, { compact: true }), tone: "neutral" },
        { label: "At risk", value: fmtMoney(revenue.atRiskTotal, { compact: true }), tone: "bad" },
        { label: "Exposure", value: fmtPct(revenue.atRiskShare), tone: "warn" },
        { label: "Recognized", value: fmtMoney(revenue.recognizedTotal, { compact: true }), tone: "ok" },
      ],
      recommendedActionSeed:
        "Re-forecast the slipping and renewal-contingent lines, decide which commitments to protect, and brief affected clients before quarter-end.",
    });
  }

  // 6. Rank
  items.sort((a, b) => b.score - a.score);

  const stats = {
    clients: ds.clients.length,
    projects: ds.projects.length,
    highRisk: items.filter((i) => i.band === "high").length,
    atRiskRevenue: revenue.atRiskTotal,
    overAllocatedPeople: capacity.people.filter((p) => p.utilization !== null && p.utilization > 1).length,
    dataIssues: ds.issues.length,
  };

  return { asOf: ds.asOf, source: ds.source, items, capacity, revenue, stats };
}

function capacityItem(t: TeamLoad): AttentionItem {
  const maxUtil = Math.max(...t.overAllocated.map((p) => p.utilization ?? 0), t.utilization ?? 0);
  const score = clamp(
    Math.round((maxUtil - 1) * 120 + t.overAllocated.length * 8 + t.contendedProjects.length * 6),
    20,
    100,
  );
  const factors: RiskFactor[] = [];
  factors.push({
    kind: "capacity",
    label: `${t.overAllocated.length} people over 100% utilization`,
    detail: t.overAllocated
      .map((p) => `${p.name} ${fmtPct(p.utilization)}`)
      .join(", "),
    weight: t.overAllocated.length * 8,
    evidence: t.overAllocated.map((p) => ({
      kind: "allocation" as const,
      label: p.name,
      detail: `${p.allocatedHours}h booked vs ${p.capacity}h capacity (${fmtPct(p.utilization)})`,
    })),
  });
  if (t.contendedProjects.length) {
    factors.push({
      kind: "capacity",
      label: `${t.contendedProjects.length} projects competing for the same people`,
      detail: t.contendedProjects.map((c) => `${c.name} (${c.people} shared)`).join(", "),
      weight: t.contendedProjects.length * 6,
      evidence: t.contendedProjects.map((c) => ({ kind: "allocation" as const, label: c.name, detail: `${c.people} over-allocated people` })),
    });
  }
  if (t.unknownCapacity.length) {
    factors.push({
      kind: "data",
      label: `${t.unknownCapacity.length} booked with no recorded capacity`,
      detail: t.unknownCapacity.map((p) => p.name).join(", ") + " — their true load is unknown.",
      weight: 6,
      evidence: t.unknownCapacity.map((p) => ({ kind: "allocation" as const, label: p.name, detail: `${p.allocatedHours}h booked, capacity unknown` })),
    });
  }

  const teamOver = (t.utilization ?? 0) > 1;
  const title = teamOver ? `${t.team} team is over capacity` : `${t.team} team has over-allocated people`;
  const headline = teamOver
    ? `The ${t.team} team is stretched past capacity — ${t.overAllocated.length} people over 100%${t.contendedProjects.length ? `, with ${t.contendedProjects.length} projects competing for the same people` : ""}.`
    : `${t.team} runs at ${fmtPct(t.utilization)} on average, but ${t.overAllocated.length} key people are over 100% — a concentration risk even though the team as a whole has headroom.`;
  return {
    id: `cap-${t.team}`,
    kind: "capacity",
    refId: t.team,
    title,
    subtitle: t.utilization !== null ? `Team running at ${fmtPct(t.utilization)} of capacity` : "Utilization partly unknown",
    band: "capacity",
    score,
    headline,
    factors,
    metrics: [
      { label: "Team utilization", value: t.utilization !== null ? fmtPct(t.utilization) : "—", tone: "bad" },
      { label: "Over-allocated", value: String(t.overAllocated.length), tone: "warn" },
      { label: "Contended projects", value: String(t.contendedProjects.length), tone: "warn" },
      { label: "Booked hours", value: `${t.allocatedHours}h`, tone: "neutral" },
    ],
    recommendedActionSeed:
      t.contendedProjects.length > 0
        ? `Sequence or re-staff the competing projects (${t.contendedProjects.map((c) => c.name).join(", ")}); the team can't deliver all of them in parallel at quality.`
        : "Rebalance allocations or add capacity before quality slips.",
  };
}

/** Expose raw scores for places that need them (e.g. detail pages). */
export function scoreAll(ds: Dataset) {
  const projectScores = new Map<string, RiskResult>();
  for (const p of ds.projects) projectScores.set(p.id, scoreProject(p, ds));
  const clientScores = new Map<string, RiskResult>();
  for (const c of ds.clients) clientScores.set(c.id, scoreClient(c, ds, projectScores));
  return { projectScores, clientScores };
}

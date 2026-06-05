import { AGENCY } from "../config";
import { fmtMoney, fmtPctWhole } from "../format";
import type { ExecState } from "../engine";

/**
 * Builds the grounding context the AI reasons over. Every number here comes from
 * the deterministic engine — the model's job is to explain and prioritise, never
 * to compute or invent. This is the guardrail against hallucination.
 */
export function buildContext(state: ExecState): string {
  const { briefing: b, dataset: ds, dataConfidence: dc } = state;
  const L: string[] = [];

  L.push(`# ${AGENCY.name} — Executive Operating Snapshot`);
  L.push(`As-of date: ${b.asOf}. Current quarter: ${b.revenue.quarter}. Data source: ${b.source}.`);
  L.push(
    `Portfolio: ${b.stats.clients} clients, ${b.stats.projects} active projects, ` +
      `${b.stats.highRisk} high-risk items, ${fmtMoney(b.stats.atRiskRevenue)} revenue at risk this quarter, ` +
      `${b.stats.overAllocatedPeople} people over-allocated, ${b.stats.dataIssues} data-quality issues.`,
  );

  L.push(`\n## Ranked attention items (highest priority first)`);
  for (const i of b.items) {
    L.push(
      `\n### ${i.title}  [kind=${i.kind}, band=${i.band}, score=${i.score}/100, id=${i.id}, ref=${i.refId}]`,
    );
    L.push(`Subtitle: ${i.subtitle}`);
    L.push(`Headline: ${i.headline}`);
    if (i.confidenceNote) L.push(`Data caveat: ${i.confidenceNote}`);
    L.push(`Metrics: ${i.metrics.map((m) => `${m.label}=${m.value}`).join(", ")}`);
    L.push(`Why (factors):`);
    for (const f of i.factors) L.push(`  - (${f.kind}, +${Math.round(f.weight)}) ${f.label} — ${f.detail}`);
    L.push(`Suggested action (baseline): ${i.recommendedActionSeed}`);
  }

  L.push(`\n## Revenue — ${b.revenue.quarter}`);
  L.push(
    `Committed ${fmtMoney(b.revenue.committedTotal)}, recognized ${fmtMoney(b.revenue.recognizedTotal)}, ` +
      `at risk ${fmtMoney(b.revenue.atRiskTotal)} (${fmtPctWhole(b.revenue.atRiskShare * 100)}).`,
  );
  for (const l of b.revenue.lines) {
    L.push(
      `  - ${l.projectName} (${l.clientName}): committed ${fmtMoney(l.committed)}, recognized ${fmtMoney(l.recognized)}` +
        (l.atRisk ? ` — AT RISK [${l.riskType}]: ${l.riskReason}` : ` — on track`),
    );
  }

  L.push(`\n## Capacity`);
  for (const t of b.capacity.teams) {
    const util = t.utilization !== null ? fmtPctWhole(t.utilization * 100) : "unknown";
    L.push(
      `  - ${t.team}: utilization ${util}, ${t.overAllocated.length} over-allocated, ` +
        `${t.contendedProjects.length} contended projects, ${t.unknownCapacity.length} with unknown capacity.`,
    );
    for (const p of t.overAllocated)
      L.push(`      · ${p.name} ${fmtPctWhole((p.utilization ?? 0) * 100)} (${p.allocatedHours}h / ${p.capacity}h)`);
  }

  L.push(`\n## All projects (reference figures)`);
  for (const p of ds.projects) {
    L.push(
      `  - ${p.name} | client ${p.clientName ?? "?"} | status ${p.statusRaw ?? "?"} | ` +
        `budget ${fmtMoney(p.budget)} | spent ${p.hasBudgetConflict ? "CONFLICT" : fmtMoney(p.spentWorstCase)} | ` +
        `delivery ${fmtPctWhole(p.percentComplete)} | due ${p.due ?? "?"} | last update ${p.lastUpdate ?? "?"}`,
    );
  }

  L.push(`\n## All clients (reference figures)`);
  for (const c of ds.clients) {
    L.push(
      `  - ${c.name} | ${c.industry ?? "?"} | ${fmtMoney(c.contractValue)}/yr | ` +
        `renewal ${c.renewalDate ?? "?"} | last contact ${c.lastContact ?? "?"} (${c.daysSinceContact ?? "?"}d ago) | ` +
        `health ${c.healthRaw?.trim() || "blank"} | AM ${c.accountManager ?? "?"}`,
    );
  }

  L.push(`\n## What changed this week (vs ${state.trends.priorAsOf})`);
  const pf = state.trends.portfolio;
  L.push(
    `Revenue at risk ${fmtMoney(pf.revenueAtRisk.prior)} → ${fmtMoney(pf.revenueAtRisk.current)} (${pf.revenueAtRisk.delta >= 0 ? "+" : ""}${fmtMoney(pf.revenueAtRisk.delta)}); ` +
      `high-risk items ${pf.highRisk.prior} → ${pf.highRisk.current}.`,
  );
  for (const m of state.trends.movers) L.push(`  - [${m.direction}] ${m.title}: ${m.summary} (${m.deltaText})`);

  L.push(`\n## Active alerts (threshold-triggered)`);
  for (const a of state.alerts) L.push(`  - [${a.severity}] (${a.category}) ${a.title} — ${a.detail} [rule: ${a.rule}]`);

  L.push(`\n## Data confidence`);
  L.push(`Score ${dc.score}/100 (${dc.level}). ${dc.summaryLine}`);
  for (const g of dc.groups) {
    L.push(`  ${g.label}:`);
    for (const is of g.issues) L.push(`    - [${is.severity}] ${is.entityName}: ${is.title} — ${is.detail}`);
  }

  // The raw qualitative signal — so the AI can reason about relationships, sentiment,
  // and what people are actually saying, not just the metrics.
  L.push(`\n## Field notes (raw status updates — the human signal behind the numbers)`);
  for (const n of ds.notes) {
    if (n.entityType === "unknown") continue;
    const where = n.entityType === "team" ? `team:${n.entityId}` : n.entityId;
    L.push(`  - [${n.date ?? "n/a"}] ${n.author ?? "Unknown"} (${n.channel ?? "note"}) re ${where}: "${n.text}"`);
  }

  return L.join("\n");
}

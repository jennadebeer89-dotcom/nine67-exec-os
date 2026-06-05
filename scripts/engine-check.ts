/**
 * Quick deterministic sanity check on the engine (no AI, no DB).
 *   pnpm engine:check
 */
import { normalize } from "../src/lib/normalize";
import { buildBriefing } from "../src/lib/engine/attention";
import { buildDataConfidence } from "../src/lib/engine/dataConfidence";
import { buildTrends } from "../src/lib/engine/trends";
import { buildAlerts } from "../src/lib/engine/alerts";
import { DATA_AS_OF } from "../src/lib/config";
import {
  RAW_ALLOCATIONS, RAW_BUDGET_RECORDS, RAW_CLIENTS, RAW_EMPLOYEES,
  RAW_FORECASTS, RAW_NOTES, RAW_PROJECTS,
} from "../src/data/raw";

const n = normalize({
  clients: RAW_CLIENTS, projects: RAW_PROJECTS, employees: RAW_EMPLOYEES,
  allocations: RAW_ALLOCATIONS, notes: RAW_NOTES, budgets: RAW_BUDGET_RECORDS, forecasts: RAW_FORECASTS,
});
const ds = { ...n, source: "local" as const, asOf: DATA_AS_OF };
const b = buildBriefing(ds);
const dc = buildDataConfidence(ds);

console.log("\n=== ATTENTION (ranked) ===");
for (const i of b.items) {
  console.log(`${String(i.score).padStart(3)}  [${i.band.padEnd(8)}] ${i.kind.padEnd(8)} ${i.title}`);
  console.log(`      ${i.headline}`);
}

console.log("\n=== REVENUE ===");
console.log(`Committed: ${b.revenue.committedTotal.toLocaleString()}  At risk: ${b.revenue.atRiskTotal.toLocaleString()}  (${(b.revenue.atRiskShare * 100).toFixed(0)}%)`);
for (const l of b.revenue.lines.filter((x) => x.atRisk))
  console.log(`  - ${l.projectName.padEnd(34)} ${String(l.committed).padStart(7)} [${l.riskType}] ${l.riskReason}`);

console.log("\n=== CAPACITY ===");
for (const t of b.capacity.teams) {
  const util = t.utilization !== null ? (t.utilization * 100).toFixed(0) + "%" : "?";
  console.log(`  ${t.team.padEnd(16)} util ${util.padStart(5)}  over:${t.overAllocated.length}  contended:${t.contendedProjects.length}  unknown:${t.unknownCapacity.length}`);
}

console.log("\n=== DATA CONFIDENCE ===");
console.log(`Score ${dc.score}/100 (${dc.level}).  ${dc.summaryLine}`);
console.log(`Issues: high=${dc.counts.high} medium=${dc.counts.medium} low=${dc.counts.low} total=${dc.counts.total}`);
for (const g of dc.groups) {
  console.log(`  ${g.label}:`);
  for (const i of g.issues) console.log(`    - [${i.severity}] ${i.entityName}: ${i.title}`);
}

console.log("\n=== TRENDS (vs prior week) ===");
const tr = buildTrends(ds, b);
console.log(`Portfolio: revenue-at-risk ${tr.portfolio.revenueAtRisk.prior.toLocaleString()} -> ${tr.portfolio.revenueAtRisk.current.toLocaleString()} (Δ${tr.portfolio.revenueAtRisk.delta.toLocaleString()}); high-risk ${tr.portfolio.highRisk.prior}->${tr.portfolio.highRisk.current}; design util ${tr.portfolio.designUtil ? (tr.portfolio.designUtil.prior*100).toFixed(0)+"%->"+(tr.portfolio.designUtil.current*100).toFixed(0)+"%" : "?"}`);
for (const m of tr.movers) console.log(`  [${m.direction}] ${m.title} — ${m.summary} (${m.deltaText})`);

console.log("\n=== ALERTS ===");
const alerts = buildAlerts(ds, b, tr);
for (const a of alerts) console.log(`  [${a.severity.toUpperCase().padEnd(8)}] (${a.category}) ${a.title} — rule: ${a.rule}`);

console.log(`\nStats: ${JSON.stringify(b.stats)}\n`);

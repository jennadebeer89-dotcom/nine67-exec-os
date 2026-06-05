import { fmtMoney, fmtPct, fmtPctWhole } from "../format";
import { normalize } from "../normalize";
import { buildPriorRaw, PRIOR_AS_OF } from "@/data/history";
import type { Dataset } from "../types";
import { buildBriefing, scoreAll } from "./attention";
import type { Briefing, ScoreTrend, TrendMover, TrendReport } from "./types";

/**
 * Trend engine. Builds the prior-week dataset through the SAME pipeline, then
 * diffs it against the current briefing. Every delta here is real — two snapshots,
 * one scoring engine — so "burn accelerated 14 points" is computed, not asserted.
 */
export function buildPriorDataset(): Dataset {
  const n = normalize(buildPriorRaw(), PRIOR_AS_OF);
  return { ...n, source: "local", asOf: PRIOR_AS_OF };
}

export function buildTrends(currentDs: Dataset, current: Briefing): TrendReport {
  const priorDs = buildPriorDataset();
  const prior = buildBriefing(priorDs);

  const curScores = scoreAll(currentDs);
  const priScores = scoreAll(priorDs);

  // --- per-entity score trends, keyed for UI lookup ---
  const scoreByKey: Record<string, ScoreTrend> = {};
  const put = (key: string, cur: number, pri: number) => {
    scoreByKey[key] = { current: cur, prior: pri, delta: cur - pri, isNew: pri < 20 && cur >= 38 };
  };
  for (const p of currentDs.projects)
    put(`project:${p.id}`, curScores.projectScores.get(p.id)?.score ?? 0, priScores.projectScores.get(p.id)?.score ?? 0);
  for (const c of currentDs.clients)
    put(`client:${c.id}`, curScores.clientScores.get(c.id)?.score ?? 0, priScores.clientScores.get(c.id)?.score ?? 0);
  for (const item of current.items.filter((i) => i.kind === "capacity" || i.kind === "revenue")) {
    const priorItem = prior.items.find((i) => i.id === item.id);
    put(`${item.kind}:${item.refId}`, item.score, priorItem?.score ?? 0);
  }

  // --- portfolio deltas ---
  const designCur = current.capacity.teams.find((t) => t.team === "Design")?.utilization ?? null;
  const designPri = prior.capacity.teams.find((t) => t.team === "Design")?.utilization ?? null;
  const portfolio = {
    revenueAtRisk: delta(current.revenue.atRiskTotal, prior.revenue.atRiskTotal),
    highRisk: delta(current.stats.highRisk, prior.stats.highRisk),
    designUtil: designCur !== null && designPri !== null ? delta(designCur, designPri) : undefined,
  };

  // --- movers: the specific, narrative changes worth surfacing ---
  const movers: TrendMover[] = [];
  const seen = new Set<string>();
  const add = (m: TrendMover) => {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      movers.push(m);
    }
  };

  // 1. Budget burn accelerations
  const priProjById = new Map(priorDs.projects.map((p) => [p.id, p]));
  for (const p of currentDs.projects) {
    const prj = priProjById.get(p.id);
    if (!prj || p.burnRatio === null || prj.burnRatio === null) continue;
    const d = p.burnRatio - prj.burnRatio;
    if (d >= 0.04) {
      add({
        id: `burn:${p.id}`,
        title: p.name,
        direction: "worse",
        summary: `Budget burn accelerated to ${fmtPctWhole(p.burnRatio * 100)} of budget (delivery at ${fmtPctWhole(p.percentComplete)}).`,
        deltaText: `${fmtPctWhole(prj.burnRatio * 100)}→${fmtPctWhole(p.burnRatio * 100)} burn`,
        refId: p.id,
        kind: "project",
      });
    }
  }

  // 2. Revenue lines newly at risk
  const priorAtRisk = new Set(prior.revenue.lines.filter((l) => l.atRisk).map((l) => l.projectId));
  for (const l of current.revenue.lines) {
    if (l.atRisk && l.projectId && !priorAtRisk.has(l.projectId)) {
      add({
        id: `rev:${l.projectId}`,
        title: l.projectName,
        direction: "worse",
        summary: `${fmtMoney(l.committed, { compact: true })} of revenue moved to at-risk — ${l.riskReason}`,
        deltaText: `+${fmtMoney(l.committed, { compact: true })} at risk`,
        refId: l.projectId,
        kind: "project",
      });
    }
  }

  // 3. Clients that crossed into "silent" this week
  const priClientById = new Map(priorDs.clients.map((c) => [c.id, c]));
  for (const c of currentDs.clients) {
    const pc = priClientById.get(c.id);
    const curSilent = (c.daysSinceContact ?? 0) > 21;
    const priSilent = (pc?.daysSinceContact ?? 0) > 21;
    if (curSilent && !priSilent) {
      add({
        id: `silent:${c.id}`,
        title: c.name,
        direction: "worse",
        summary: `Crossed the silent-client line — no contact in ${c.daysSinceContact} days.`,
        deltaText: `now ${c.daysSinceContact}d quiet`,
        refId: c.id,
        kind: "client",
      });
    }
  }

  // 4. Capacity worsening
  if (portfolio.designUtil && portfolio.designUtil.delta > 0.02) {
    add({
      id: `cap:Design`,
      title: "Design team capacity",
      direction: "worse",
      summary: `Design utilization rose to ${fmtPct(portfolio.designUtil.current)} as the Orbit portal ramped up.`,
      deltaText: `${fmtPct(portfolio.designUtil.prior)}→${fmtPct(portfolio.designUtil.current)}`,
      refId: "Design",
      kind: "capacity",
    });
  }

  // 5. Catch any large score jump not already covered (worse or better)
  const entityTitle = (key: string) => {
    const [kind, refId] = key.split(":");
    if (kind === "project") return currentDs.projects.find((p) => p.id === refId)?.name;
    if (kind === "client") return currentDs.clients.find((c) => c.id === refId)?.name;
    return undefined;
  };
  const jumps = Object.entries(scoreByKey)
    .map(([key, t]) => ({ key, ...t }))
    .filter((t) => Math.abs(t.delta) >= 8)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  for (const j of jumps) {
    const refId = j.key.split(":")[1];
    if (seen.has(`burn:${refId}`) || seen.has(`rev:${refId}`) || seen.has(`silent:${refId}`)) continue;
    const title = entityTitle(j.key);
    if (!title) continue;
    add({
      id: `score:${j.key}`,
      title,
      direction: j.delta > 0 ? "worse" : "better",
      summary:
        j.delta > 0
          ? `Risk rose ${j.delta} points this week.`
          : `Risk eased ${Math.abs(j.delta)} points this week.`,
      deltaText: `${j.delta > 0 ? "+" : ""}${j.delta} risk`,
      refId,
    });
  }

  // Resolve a deep-link target only when the entity is a surfaced attention item.
  for (const m of movers) {
    if (m.kind && m.refId) {
      m.itemId = current.items.find((i) => i.kind === m.kind && i.refId === m.refId)?.id;
    }
  }

  // Order: worse first (by magnitude implied via insertion), then new, then better.
  movers.sort((a, b) => rank(a.direction) - rank(b.direction));

  return { asOf: current.asOf, priorAsOf: PRIOR_AS_OF, scoreByKey, movers, portfolio };
}

function delta(current: number, prior: number) {
  return { current, prior, delta: current - prior };
}
function rank(d: TrendMover["direction"]) {
  return d === "worse" ? 0 : d === "new" ? 1 : 2;
}

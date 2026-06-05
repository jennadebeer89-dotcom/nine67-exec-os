import { fmtMoney, fmtPct, fmtPctWhole } from "../format";
import type { ExecState } from "../engine";

/**
 * Deterministic chat responder used when no OpenAI key is present (or a call
 * fails). It pattern-matches leadership's common questions to the engine output
 * so the demo always answers the benchmark questions accurately — never a dead end.
 */
export function fallbackAnswer(question: string, state: ExecState): string {
  const q = question.toLowerCase();
  const b = state.briefing;

  // "Why is <named entity> ...?" / "tell me about <named entity>" — only fires on a
  // STRONG name match (a distinctive token, not a generic word like "risk"/"budget"),
  // so "which clients are at risk, and why?" correctly falls through to the clients branch.
  const named = findNamedItem(q, state);
  if (named && /\b(why|explain|tell me|status|how is|what'?s (going on|happening|up) with|about)\b/.test(q)) {
    const why = named.factors.slice(0, 4).map((f) => `• ${f.label} — ${f.detail}`).join("\n");
    return `${named.title} is rated ${named.band} (${named.score}/100).\n\n${why}\n\nRecommended: ${named.recommendedActionSeed}`;
  }

  // What changed this week (trends) — checked before "focus" so it isn't swallowed by "this week"
  if (/(what.*chang|chang.*(week|since)|since last week|trend|momentum|moved to|got worse|gotten worse|what'?s different|whats different|accelerat)/.test(q)) {
    const movers = b ? state.trends.movers.slice(0, 6) : [];
    const pf = state.trends.portfolio;
    const lines = movers.map((m) => `• ${m.title} — ${m.summary} (${m.deltaText})`).join("\n");
    return `What changed since last week:\n\n${lines}\n\nPortfolio: revenue at risk ${fmtMoney(pf.revenueAtRisk.prior, { compact: true })} → ${fmtMoney(pf.revenueAtRisk.current, { compact: true })}, high-risk items ${pf.highRisk.prior} → ${pf.highRisk.current}.`;
  }

  // Alerts / notifications
  if (/(alert|notif|urgent|fire|flag|attention now|needs? action)/.test(q)) {
    const crit = state.alerts.filter((a) => a.severity === "critical");
    const warn = state.alerts.filter((a) => a.severity === "warning");
    const critL = crit.map((a) => `• [critical] ${a.title} — ${a.detail}`).join("\n");
    const warnL = warn.slice(0, 5).map((a) => `• [warning] ${a.title}`).join("\n");
    return `There are ${state.alertCounts.critical} critical and ${state.alertCounts.warning} warning alerts.\n\n${critL}${warnL ? "\n" + warnL : ""}`;
  }

  // Focus this week
  if (/(focus|attention|this week|priorit|wake|worry)/.test(q)) {
    const top = b.items.slice(0, 4);
    const lines = top.map((i, n) => `${n + 1}. ${i.title} — ${stripDot(i.headline)} [${i.band}]`).join("\n");
    return `This week, in priority order:\n\n${lines}\n\nThe single most important: ${stripDot(b.items[0]?.headline ?? "—")}.`;
  }

  // Clients at risk
  if (/(client|account).*(risk|churn|losing|lose)|(risk|churn).*(client|account)/.test(q) || /which clients/.test(q)) {
    const clients = b.items.filter((i) => i.kind === "client");
    if (clients.length) {
      const lines = clients.map((i) => `• ${i.title} (${i.band}, ${i.score}/100) — ${stripDot(i.headline)}`).join("\n");
      return `The accounts most at risk:\n\n${lines}`;
    }
  }

  // Over budget projects
  if (/(over budget|overbudget|budget|burn|margin|overrun)/.test(q)) {
    const ds = state.dataset;
    const over = ds.projects.filter((p) => p.burnRatio !== null && p.burnRatio >= 0.85);
    const conflict = ds.projects.filter((p) => p.hasBudgetConflict);
    const lines = over
      .sort((a, b2) => (b2.burnRatio ?? 0) - (a.burnRatio ?? 0))
      .map((p) => `• ${p.name}: ${fmtPctWhole((p.burnRatio ?? 0) * 100)} of budget spent at ${fmtPctWhole(p.percentComplete)} delivered`)
      .join("\n");
    const conflictLine = conflict.length
      ? `\n\nNote: ${conflict.map((p) => p.name).join(", ")} has conflicting spend figures between finance and delivery — its true burn is unconfirmed.`
      : "";
    return `Projects burning hot on budget:\n\n${lines}${conflictLine}`;
  }

  // Revenue at risk
  if (/(revenue|forecast|commit|quarter|money|cash)/.test(q)) {
    const r = b.revenue;
    const lines = r.lines
      .filter((l) => l.atRisk)
      .map((l) => `• ${l.projectName} — ${fmtMoney(l.committed, { compact: true })} [${l.riskType}]: ${l.riskReason}`)
      .join("\n");
    return `Of ${fmtMoney(r.committedTotal, { compact: true })} committed this quarter, ${fmtMoney(r.atRiskTotal, { compact: true })} (${fmtPct(r.atRiskShare)}) is at risk:\n\n${lines}`;
  }

  // Capacity / overloaded teams
  if (/(capacity|overloaded|stretched|over.?alloc|utilization|utilisation|team|people|resourc)/.test(q)) {
    const teams = b.capacity.teams.filter((t) => t.overAllocated.length > 0);
    const lines = teams
      .map((t) => {
        const people = t.overAllocated.map((p) => `${p.name} ${fmtPct(p.utilization)}`).join(", ");
        return `• ${t.team} (${t.utilization !== null ? fmtPct(t.utilization) : "?"} team avg): ${t.overAllocated.length} over 100% — ${people}`;
      })
      .join("\n");
    const contend = b.capacity.teams.find((t) => t.contendedProjects.length);
    const contendLine = contend
      ? `\n\n${contend.team}'s load is worst: ${contend.contendedProjects.map((c) => c.name).join(", ")} are competing for the same people.`
      : "";
    return `Where we're stretched:\n\n${lines}${contendLine}`;
  }

  // Data quality / trust
  if (/(data|trust|confidence|missing|conflict|stale|reliable|accurate)/.test(q)) {
    const dc = state.dataConfidence;
    const top = dc.groups.flatMap((g) => g.issues).slice(0, 6).map((i) => `• [${i.severity}] ${i.entityName}: ${i.title}`).join("\n");
    return `Data confidence is ${dc.level} (${dc.score}/100). ${dc.summaryLine}\n\n${top}`;
  }

  // Default: top priorities
  const top = b.items.slice(0, 3).map((i, n) => `${n + 1}. ${i.title} — ${stripDot(i.headline)}`).join("\n");
  return `Here's where things stand right now:\n\n${top}\n\nAsk me about clients at risk, revenue at risk, over-budget projects, team capacity, or why a specific project is flagged.`;
}

function stripDot(s: string) {
  return s.replace(/\.$/, "");
}

// Generic words that appear in many names — never enough on their own to identify an entity.
const NAME_STOPWORDS = new Set([
  "risk", "budget", "revenue", "team", "client", "account", "project", "mobile", "app",
  "portal", "build", "phase", "group", "commerce", "data", "platform", "rollout", "media",
  "energy", "bank", "logistics", "financial", "health", "patient", "field", "ops", "self",
  "service", "loyalty", "brand", "refresh", "migration", "integration", "dashboard", "network",
  "booking", "revamp", "customer", "launch", "the", "and", "for",
]);

function significantTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !NAME_STOPWORDS.has(w));
}

/** Find the attention item whose client/project name is distinctively named in the question. */
function findNamedItem(q: string, state: ExecState) {
  const { briefing: b, dataset: ds } = state;
  // Map refId -> item for projects/clients.
  const itemByRef = new Map(b.items.map((i) => [i.refId, i]));
  const nameByRef: { ref: string; name: string }[] = [
    ...ds.clients.map((c) => ({ ref: c.id, name: c.name })),
    ...ds.projects.map((p) => ({ ref: p.id, name: p.name })),
  ];
  const candidates: { ref: string; score: number }[] = [];
  for (const { ref, name } of nameByRef) {
    const tokens = significantTokens(name);
    const hits = tokens.filter((t) => q.includes(t)).length;
    if (hits > 0) candidates.push({ ref, score: hits });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b2) => b2.score - a.score);
  // Return the highest-scoring candidate that actually resolves to an attention item
  // (a client with no risk item falls through to its risky project, which is more useful).
  for (const c of candidates) {
    const item =
      itemByRef.get(c.ref) || b.items.find((i) => i.id === `prj-${c.ref}` || i.id === `cli-${c.ref}`);
    if (item) return item;
  }
  return null;
}

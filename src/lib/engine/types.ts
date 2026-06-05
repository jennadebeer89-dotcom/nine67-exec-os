import type { RiskBand } from "../types";

/** A single piece of evidence backing a risk factor — points at a real record. */
export interface Evidence {
  kind: "metric" | "note" | "budget" | "forecast" | "allocation" | "conflict";
  label: string;
  detail?: string;
  sourceId?: string; // note id, project id, etc.
  date?: string | null;
}

export type FactorKind =
  | "budget"
  | "delivery"
  | "timeline"
  | "sentiment"
  | "stale"
  | "renewal"
  | "capacity"
  | "payment"
  | "data";

/** A contributing reason behind a risk score, with its own evidence trail. */
export interface RiskFactor {
  kind: FactorKind;
  label: string; // short chip, e.g. "Budget 92% consumed at 65% delivery"
  detail: string; // one-sentence explanation
  weight: number; // points contributed to the 0–100 score
  evidence: Evidence[];
}

export interface Metric {
  label: string;
  value: string;
  tone?: "bad" | "warn" | "ok" | "neutral";
}

export type AttentionKind = "project" | "client" | "capacity" | "revenue";

/** One ranked thing competing for leadership attention this week. */
export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  refId: string; // project/client id or team name
  title: string;
  subtitle: string;
  band: RiskBand;
  score: number; // 0–100
  /** Deterministic one-line summary; the AI rewrites this into the polished "why". */
  headline: string;
  factors: RiskFactor[];
  metrics: Metric[];
  /** Deterministic recommended action; the AI refines tone/specifics. */
  recommendedActionSeed: string;
  confidenceNote?: string; // when data quality undercuts the read
}

export interface PersonLoad {
  id: string;
  name: string;
  role: string | null;
  team: string | null;
  allocatedHours: number;
  capacity: number | null;
  utilization: number | null; // null when capacity unknown
  projects: string[]; // project ids
}

export interface TeamLoad {
  team: string;
  allocatedHours: number;
  knownCapacity: number;
  utilization: number | null;
  overAllocated: PersonLoad[];
  unknownCapacity: PersonLoad[];
  contendedProjects: { projectId: string; name: string; people: number }[];
  people: PersonLoad[];
}

export interface CapacityReport {
  teams: TeamLoad[];
  people: PersonLoad[];
}

export interface RevenueLine {
  projectId: string | null;
  clientId: string | null;
  projectName: string;
  clientName: string;
  committed: number;
  recognized: number;
  atRisk: boolean;
  riskReason: string | null;
  riskType: "timing" | "renewal" | "delivery" | "cash" | "data" | null;
}

export interface RevenueReport {
  quarter: string;
  committedTotal: number;
  recognizedTotal: number;
  atRiskTotal: number;
  atRiskShare: number; // 0–1
  lines: RevenueLine[];
}

export interface ScoreTrend {
  current: number;
  prior: number;
  delta: number;
  isNew: boolean; // surfaced now, effectively absent before
}

export interface TrendMover {
  id: string;
  title: string;
  direction: "worse" | "better" | "new";
  summary: string; // human one-liner
  deltaText: string; // e.g. "+14 risk", "78%→92% burn", "+$420k"
  refId?: string;
  kind?: AttentionKind;
  itemId?: string; // resolved link target, set only when a surfaced item exists
}

export interface MetricDelta {
  current: number;
  prior: number;
  delta: number;
}

export interface TrendReport {
  asOf: string;
  priorAsOf: string;
  /** keyed by `${kind}:${refId}` — used to show per-item trend chips */
  scoreByKey: Record<string, ScoreTrend>;
  movers: TrendMover[];
  portfolio: {
    revenueAtRisk: MetricDelta;
    highRisk: MetricDelta;
    designUtil?: MetricDelta;
  };
}

export interface Briefing {
  asOf: string;
  source: "supabase" | "local";
  items: AttentionItem[];
  capacity: CapacityReport;
  revenue: RevenueReport;
  /** Counts for the headline metrics row. */
  stats: {
    clients: number;
    projects: number;
    highRisk: number;
    atRiskRevenue: number;
    overAllocatedPeople: number;
    dataIssues: number;
  };
}

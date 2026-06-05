import type { DataQualityIssue, Dataset } from "../types";

export interface ConfidenceGroup {
  kind: DataQualityIssue["kind"];
  label: string;
  issues: DataQualityIssue[];
}

export interface DataConfidence {
  score: number; // 0–100, a rough "how much can we trust this" read
  level: "high" | "moderate" | "low";
  counts: { high: number; medium: number; low: number; total: number };
  groups: ConfidenceGroup[];
  summaryLine: string;
}

const KIND_LABEL: Record<DataQualityIssue["kind"], string> = {
  conflict: "Conflicting figures",
  missing: "Missing information",
  stale: "Stale / outdated records",
  ambiguous: "Unclear statuses",
  orphan: "Orphaned records",
  recovered: "Recovered automatically",
};

const ORDER: DataQualityIssue["kind"][] = ["conflict", "stale", "missing", "ambiguous", "orphan", "recovered"];

export function buildDataConfidence(ds: Dataset): DataConfidence {
  const issues = ds.issues;
  const counts = {
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
    total: issues.length,
  };

  // Penalty-based score: conflicts and missing data hurt most.
  const penalty = counts.high * 9 + counts.medium * 4 + counts.low * 1.5;
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const level = score >= 80 ? "high" : score >= 60 ? "moderate" : "low";

  const groups: ConfidenceGroup[] = ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    issues: issues
      .filter((i) => i.kind === kind)
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
  })).filter((g) => g.issues.length > 0);

  const parts: string[] = [];
  const conflict = issues.filter((i) => i.kind === "conflict").length;
  const stale = issues.filter((i) => i.kind === "stale").length;
  const missing = issues.filter((i) => i.kind === "missing").length;
  const ambiguous = issues.filter((i) => i.kind === "ambiguous").length;
  if (conflict) parts.push(`${conflict} conflicting figure${conflict > 1 ? "s" : ""}`);
  if (stale) parts.push(`${stale} stale record${stale > 1 ? "s" : ""}`);
  if (missing) parts.push(`${missing} missing field${missing > 1 ? "s" : ""}`);
  if (ambiguous) parts.push(`${ambiguous} unclear status${ambiguous > 1 ? "es" : ""}`);
  const summaryLine =
    parts.length > 0
      ? `This briefing is built on imperfect data — ${joinList(parts)}. Flagged items below are read with appropriate caution.`
      : "Underlying data looks complete and consistent.";

  return { score, level, counts, groups, summaryLine };
}

function severityRank(s: DataQualityIssue["severity"]) {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}

function joinList(parts: string[]) {
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

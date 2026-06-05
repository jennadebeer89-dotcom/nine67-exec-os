import { ShieldAlert, GitMerge, Clock, HelpCircle, Unlink, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataConfidence } from "@/lib/engine/dataConfidence";
import type { IssueKind } from "@/lib/types";

const KIND_ICON: Record<IssueKind, React.ComponentType<{ className?: string }>> = {
  conflict: GitMerge,
  stale: Clock,
  missing: HelpCircle,
  ambiguous: ShieldAlert,
  orphan: Unlink,
  recovered: Wand2,
};

const SEV_DOT: Record<"high" | "medium" | "low", string> = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-muted-foreground/50",
};
const SEV_PILL: Record<"high" | "medium" | "low", string> = {
  high: "bg-risk-high-soft text-risk-high",
  medium: "bg-risk-medium-soft text-risk-medium",
  low: "bg-muted text-muted-foreground",
};
const LEVEL_CLASS: Record<DataConfidence["level"], string> = {
  high: "text-risk-low",
  moderate: "text-risk-medium",
  low: "text-risk-high",
};
const METER_FILL: Record<DataConfidence["level"], string> = {
  high: "bg-risk-low",
  moderate: "bg-risk-medium",
  low: "bg-risk-high",
};

export function DataConfidencePanel({ dc }: { dc: DataConfidence }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header: title + trust meter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">Data Confidence</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{dc.summaryLine}</p>
        </div>
        <div className="w-full shrink-0 sm:w-44">
          <div className="flex items-end justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Data trust</span>
            <span className={cn("text-xs font-semibold capitalize", LEVEL_CLASS[dc.level])}>{dc.level}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", METER_FILL[dc.level])} style={{ width: `${dc.score}%` }} />
            </div>
            <span className={cn("tnum text-sm font-semibold", LEVEL_CLASS[dc.level])}>{dc.score}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <CountPill className={SEV_PILL.high} label="high" n={dc.counts.high} />
            <CountPill className={SEV_PILL.medium} label="med" n={dc.counts.medium} />
            <CountPill className={SEV_PILL.low} label="low" n={dc.counts.low} />
          </div>
        </div>
      </div>

      {/* Grouped issues */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {dc.groups.map((g) => {
          const Icon = KIND_ICON[g.kind];
          return (
            <div key={g.kind} className="rounded-xl border border-border/70 bg-background/40 p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <h3 className="text-sm font-semibold text-foreground">{g.label}</h3>
                <span className="tnum ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {g.issues.length}
                </span>
              </div>
              <ul className="divide-y divide-border/60">
                {g.issues.map((i) => (
                  <li key={i.id} className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEV_DOT[i.severity])} title={i.severity} />
                    <span className="min-w-0 text-sm leading-snug">
                      <span className="font-medium text-foreground">{i.entityName}</span>
                      <span className="text-muted-foreground"> — {i.title}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CountPill({ label, n, className }: { label: string; n: number; className: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", className)}>
      <span className="tnum">{n}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

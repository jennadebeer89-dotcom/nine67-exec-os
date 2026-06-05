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

const SEV_CLASS: Record<"high" | "medium" | "low", string> = {
  high: "bg-risk-high-soft text-risk-high",
  medium: "bg-risk-medium-soft text-risk-medium",
  low: "bg-muted text-muted-foreground",
};

const LEVEL_CLASS: Record<DataConfidence["level"], string> = {
  high: "text-risk-low",
  moderate: "text-risk-medium",
  low: "text-risk-high",
};

export function DataConfidencePanel({ dc }: { dc: DataConfidence }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">Data Confidence</h2>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{dc.summaryLine}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={cn("tnum font-display text-3xl font-semibold leading-none", LEVEL_CLASS[dc.level])}>
            {dc.score}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">/ 100 · {dc.level}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <CountPill className={SEV_CLASS.high} label="high" n={dc.counts.high} />
        <CountPill className={SEV_CLASS.medium} label="medium" n={dc.counts.medium} />
        <CountPill className={SEV_CLASS.low} label="low" n={dc.counts.low} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {dc.groups.map((g) => {
          const Icon = KIND_ICON[g.kind];
          return (
            <div key={g.kind} className="rounded-lg border border-border/70 bg-background/50 p-3.5">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">{g.label}</h3>
                <span className="tnum text-xs text-muted-foreground">{g.issues.length}</span>
              </div>
              <ul className="mt-2.5 space-y-2">
                {g.issues.map((i) => (
                  <li key={i.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                        SEV_CLASS[i.severity],
                      )}
                    >
                      {i.severity}
                    </span>
                    <span className="min-w-0">
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
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium", className)}>
      <span className="tnum">{n}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

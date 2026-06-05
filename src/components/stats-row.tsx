import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";
import type { Briefing } from "@/lib/engine/types";

export function StatsRow({ stats }: { stats: Briefing["stats"] }) {
  const cells = [
    { label: "Clients", value: String(stats.clients), tone: "neutral" },
    { label: "Active projects", value: String(stats.projects), tone: "neutral" },
    { label: "High-risk items", value: String(stats.highRisk), tone: stats.highRisk > 0 ? "bad" : "ok" },
    { label: "Revenue at risk", value: fmtMoney(stats.atRiskRevenue, { compact: true }), tone: "bad" },
    { label: "Over-allocated", value: String(stats.overAllocatedPeople), tone: stats.overAllocatedPeople > 0 ? "warn" : "ok" },
    { label: "Data gaps", value: String(stats.dataIssues), tone: "warn" },
  ] as const;

  const tone: Record<string, string> = {
    neutral: "text-foreground",
    bad: "text-risk-high",
    warn: "text-risk-medium",
    ok: "text-risk-low",
  };

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
      {cells.map((c) => (
        <div key={c.label} className="px-4 py-3.5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
          <div className={cn("tnum mt-1 font-display text-2xl font-semibold leading-none", tone[c.tone])}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

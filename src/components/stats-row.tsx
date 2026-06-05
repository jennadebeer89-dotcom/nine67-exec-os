import { cn } from "@/lib/utils";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { Briefing, RevenueReport } from "@/lib/engine/types";
import { ShieldCheck } from "lucide-react";

export function StatsRow({ stats, revenue }: { stats: Briefing["stats"]; revenue: RevenueReport }) {
  const cells = [
    { label: "Clients", value: String(stats.clients), tone: "neutral" },
    { label: "Active projects", value: String(stats.projects), tone: "neutral" },
    { label: "High-risk items", value: String(stats.highRisk), tone: stats.highRisk > 0 ? "bad" : "ok" },
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
    <div className="grid gap-4 lg:grid-cols-[1.25fr_2fr]">
      {/* ROI hero KPI — at-risk revenue framed as protectable upside */}
      <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-accent/80 to-card p-5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
            Revenue Protected Opportunity
          </span>
        </div>
        <div className="tnum mt-2 font-display text-4xl font-semibold leading-none text-foreground">
          {fmtMoney(revenue.atRiskTotal, { compact: true })}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          at risk this quarter — <span className="font-medium text-foreground">{fmtPct(revenue.atRiskShare)}</span> of{" "}
          {fmtMoney(revenue.committedTotal, { compact: true })} committed. Addressable by acting on the priorities below.
        </p>
      </div>

      {/* Supporting stats */}
      <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:grid-cols-3 lg:grid-cols-3">
        {cells.map((c) => (
          <div key={c.label} className="px-4 py-3.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
            <div className={cn("tnum mt-1 font-display text-2xl font-semibold leading-none", tone[c.tone])}>
              {c.value}
            </div>
          </div>
        ))}
        <div className="px-4 py-3.5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Committed (Q)</div>
          <div className="tnum mt-1 font-display text-2xl font-semibold leading-none text-foreground">
            {fmtMoney(revenue.committedTotal, { compact: true })}
          </div>
        </div>
      </div>
    </div>
  );
}

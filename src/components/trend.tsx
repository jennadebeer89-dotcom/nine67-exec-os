import Link from "next/link";
import { TrendingUp, TrendingDown, Sparkle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";
import type { ScoreTrend, TrendReport, TrendMover } from "@/lib/engine/types";

/** Small week-over-week delta chip for an attention item. */
export function TrendBadge({ trend, className }: { trend: ScoreTrend | undefined; className?: string }) {
  if (!trend) return null;
  if (trend.isNew) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-risk-high-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-risk-high", className)}>
        <Sparkle className="h-2.5 w-2.5" /> New this week
      </span>
    );
  }
  if (Math.abs(trend.delta) < 4) return null;
  const worse = trend.delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        worse ? "bg-risk-high-soft text-risk-high" : "bg-risk-low-soft text-risk-low",
        className,
      )}
      title={`Risk ${trend.prior} → ${trend.current} since last week`}
    >
      {worse ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {worse ? "+" : ""}
      {trend.delta}
    </span>
  );
}

const DIR_STYLE: Record<TrendMover["direction"], string> = {
  worse: "text-risk-high",
  new: "text-risk-high",
  better: "text-risk-low",
};

export function WhatChangedPanel({ trends }: { trends: TrendReport }) {
  const pf = trends.portfolio;
  const movers = trends.movers.slice(0, 5);
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-medium tracking-tight text-foreground">What changed this week</h2>
        </div>
        <span className="text-xs text-muted-foreground">vs {trends.priorAsOf}</span>
      </div>

      {/* Portfolio deltas */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <PortfolioDelta
          label="Revenue at risk"
          value={fmtMoney(pf.revenueAtRisk.current, { compact: true })}
          delta={pf.revenueAtRisk.delta !== 0 ? `${pf.revenueAtRisk.delta > 0 ? "+" : ""}${fmtMoney(pf.revenueAtRisk.delta, { compact: true })}` : "no change"}
          worse={pf.revenueAtRisk.delta > 0}
        />
        <PortfolioDelta
          label="High-risk items"
          value={String(pf.highRisk.current)}
          delta={pf.highRisk.delta !== 0 ? `${pf.highRisk.delta > 0 ? "+" : ""}${pf.highRisk.delta}` : "no change"}
          worse={pf.highRisk.delta > 0}
        />
        {pf.designUtil && (
          <PortfolioDelta
            label="Design utilization"
            value={`${Math.round(pf.designUtil.current * 100)}%`}
            delta={`${pf.designUtil.delta > 0 ? "+" : ""}${Math.round(pf.designUtil.delta * 100)} pts`}
            worse={pf.designUtil.delta > 0}
          />
        )}
      </div>

      {/* Movers */}
      <ul className="mt-5 space-y-3">
        {movers.map((m) => {
          const Icon = m.direction === "better" ? TrendingDown : TrendingUp;
          const inner = (
            <>
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", DIR_STYLE[m.direction])} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{m.title}</span>
                  <span className={cn("tabular-nums text-xs font-semibold", DIR_STYLE[m.direction])}>{m.deltaText}</span>
                </div>
                <p className="text-sm text-muted-foreground">{m.summary}</p>
              </div>
              {m.itemId && <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </>
          );
          return (
            <li key={m.id}>
              {m.itemId ? (
                <Link href={`/item/${m.itemId}`} className="flex items-start gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/60">
                  {inner}
                </Link>
              ) : (
                <div className="flex items-start gap-2.5 px-1">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PortfolioDelta({ label, value, delta, worse }: { label: string; value: string; delta: string; worse: boolean }) {
  const neutral = delta === "no change";
  return (
    <div className="rounded-lg border border-border/70 bg-background/50 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="tnum mt-1 font-display text-xl font-semibold text-foreground">{value}</div>
      <div className={cn("tnum mt-0.5 text-xs font-medium", neutral ? "text-muted-foreground" : worse ? "text-risk-high" : "text-risk-low")}>
        {neutral ? "—" : delta} this week
      </div>
    </div>
  );
}

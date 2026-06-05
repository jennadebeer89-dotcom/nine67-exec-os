import Link from "next/link";
import { ArrowRight, AlertTriangle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttentionItem, ScoreTrend } from "@/lib/engine/types";
import { BAND_BG, BAND_SOFT, BAND_TEXT, KIND_LABEL } from "@/lib/ui";
import { RiskBadge, RiskDot } from "@/components/risk-badge";
import { MetricRow } from "@/components/metrics";
import { TrendBadge } from "@/components/trend";

const BAND_RING: Record<string, string> = {
  high: "ring-risk-high/30",
  medium: "ring-risk-medium/30",
  watch: "ring-risk-watch/30",
  capacity: "ring-risk-capacity/30",
  low: "ring-risk-low/30",
};

/** Compact one-line row for lower-priority "also watch" items. */
export function CompactBriefingRow({ item, trend }: { item: AttentionItem; trend?: ScoreTrend }) {
  return (
    <Link
      href={`/item/${item.id}`}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <RiskDot band={item.band} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">{item.title}</span>
          <span className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
            {KIND_LABEL[item.kind]}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{item.headline}</p>
      </div>
      <TrendBadge trend={trend} className="shrink-0" />
      <span className="tnum shrink-0 text-sm font-semibold text-muted-foreground">{item.score}</span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function BriefingItemCard({
  item,
  rank,
  trend,
  featured = false,
}: {
  item: AttentionItem;
  rank: number;
  trend?: ScoreTrend;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/item/${item.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md",
        featured
          ? cn("border-transparent ring-1", BAND_SOFT[item.band], BAND_RING[item.band], "hover:shadow-lg")
          : "border-border bg-card hover:border-primary/30",
      )}
    >
      {/* Band accent bar (wider when featured) */}
      <span className={cn("absolute inset-y-0 left-0", featured ? "w-1.5" : "w-1", BAND_BG[item.band])} />

      <div className={cn("p-5 pl-6", featured && "pt-4")}>
        {featured && (
          <div className={cn("mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide", BAND_TEXT[item.band])}>
            <Flame className="h-3 w-3" />
            Top priority this week
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="tnum mt-0.5 text-sm font-semibold text-muted-foreground">
              {String(rank).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={cn("font-display font-medium leading-tight tracking-tight text-foreground", featured ? "text-xl" : "text-lg")}>
                  {item.title}
                </h3>
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {KIND_LABEL[item.kind]}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TrendBadge trend={trend} />
            <RiskBadge band={item.band} score={item.score} />
          </div>
        </div>

        {/* The AI/deterministic "why" headline */}
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{item.headline}</p>

        {/* Top factor chips — the evidence at a glance */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.factors.slice(0, 3).map((f, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                featured ? "border border-border bg-card" : BAND_SOFT[item.band],
                BAND_TEXT[item.band],
              )}
            >
              {f.label}
            </span>
          ))}
        </div>

        <MetricRow metrics={item.metrics} className="mt-4" />

        {item.confidenceNote && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-risk-medium" />
            {item.confidenceNote}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
          <p className="min-w-0 truncate pr-3 text-sm text-foreground/80">
            <span className="font-medium text-foreground">Next:</span> {item.recommendedActionSeed}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
            Evidence
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

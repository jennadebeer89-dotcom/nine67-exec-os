import Link from "next/link";
import { Sparkles, Quote, ArrowRight, Users, HeartCrack, EyeOff, GitCompareArrows, TrendingUp, HandHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldInsight, InsightType } from "@/lib/ai/insights";
import type { AIMode } from "@/lib/ai";
import { AIBadge } from "@/components/ai-badge";

const TYPE_META: Record<InsightType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  relationship: { label: "Relationship", icon: Users },
  trust: { label: "Trust", icon: HandHeart },
  morale: { label: "Team / morale", icon: HeartCrack },
  "hidden-risk": { label: "Hidden risk", icon: EyeOff },
  contradiction: { label: "Contradiction", icon: GitCompareArrows },
  opportunity: { label: "Opportunity", icon: TrendingUp },
};

const SEV_DOT: Record<FieldInsight["severity"], string> = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-muted-foreground/40",
};

export function AIInsightsPanel({ insights, mode }: { insights: FieldInsight[]; mode: AIMode }) {
  if (!insights.length) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm">
      <div className="border-b border-primary/15 bg-gradient-to-br from-accent/70 to-card px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              AI Insights — what the numbers don&apos;t show
            </h2>
          </div>
          <AIBadge mode={mode} />
        </div>
        <p className="mt-1.5 pl-9 text-sm text-muted-foreground">
          The AI read the field notes — calls, standups, status updates — for relationship, sentiment, and hidden
          risks the metrics miss. Advisory judgment, not hard numbers.
        </p>
      </div>

      <ul className="divide-y divide-border">
        {insights.map((ins) => {
          const meta = TYPE_META[ins.type] ?? TYPE_META["hidden-risk"];
          const Icon = meta.icon;
          const inner = (
            <div className="flex gap-3.5 px-6 py-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", SEV_DOT[ins.severity])} title={`${ins.severity} severity`} />
                  <h3 className="font-medium leading-snug text-foreground">{ins.headline}</h3>
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-foreground/85">{ins.insight}</p>
                {ins.signal && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs italic text-muted-foreground">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0" />
                    {ins.signal}
                  </p>
                )}
              </div>
              {ins.itemId && (
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 self-start text-muted-foreground" />
              )}
            </div>
          );
          return (
            <li key={ins.id}>
              {ins.itemId ? (
                <Link href={`/item/${ins.itemId}`} className="block transition-colors hover:bg-muted/40">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

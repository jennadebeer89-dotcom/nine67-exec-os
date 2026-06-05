import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";
import { getExecState } from "@/lib/engine";
import { getExecutiveSummary } from "@/lib/ai";
import { ExecSummary } from "@/components/exec-summary";
import { StatsRow } from "@/components/stats-row";
import { BriefingItemCard, CompactBriefingRow } from "@/components/briefing-item";
import { DataConfidencePanel } from "@/components/data-confidence";
import { WhatChangedPanel } from "@/components/trend";
import { AlertsBanner } from "@/components/alerts";

export const dynamic = "force-dynamic";

const STARTERS = [
  "What should I focus on this week?",
  "Which clients are most at risk?",
  "What revenue is at risk this quarter?",
];

export default async function BriefingPage() {
  const state = await getExecState();
  const summary = await getExecutiveSummary(state);

  const items = state.briefing.items;
  const primary = items.filter((i) => i.score >= 38);
  const secondary = items.filter((i) => i.score < 38);
  const trendFor = (kind: string, refId: string) => state.trends.scoreByKey[`${kind}:${refId}`];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
      <ExecSummary text={summary.text} mode={summary.mode} asOf={state.briefing.asOf} />

      <div className="mt-5">
        <StatsRow stats={state.briefing.stats} />
      </div>

      <div className="mt-5">
        <AlertsBanner counts={state.alertCounts} />
      </div>

      <div className="mt-5">
        <WhatChangedPanel trends={state.trends} />
      </div>

      {/* Ask the business teaser */}
      <Link
        href="/ask"
        className="group mt-5 flex flex-col gap-3 rounded-xl border border-primary/20 bg-accent/60 p-4 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Ask the business anything</p>
            <p className="text-xs text-muted-foreground">Grounded in live data — try one of these</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
            >
              {s}
            </span>
          ))}
          <ArrowRight className="hidden h-4 w-4 self-center text-primary transition-transform group-hover:translate-x-0.5 sm:block" />
        </div>
      </Link>

      {/* Primary attention list */}
      <section className="mt-9">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-medium tracking-tight text-foreground">Needs attention now</h2>
          <span className="text-sm text-muted-foreground">{primary.length} items, ranked by risk</span>
        </div>
        <div className="space-y-3">
          {primary.map((item, i) => (
            <BriefingItemCard key={item.id} item={item} rank={i + 1} trend={trendFor(item.kind, item.refId)} />
          ))}
        </div>
      </section>

      {/* Secondary watch list */}
      {secondary.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-medium tracking-tight text-muted-foreground">
            Also on the radar
          </h2>
          <div className="space-y-2">
            {secondary.map((item) => (
              <CompactBriefingRow key={item.id} item={item} trend={trendFor(item.kind, item.refId)} />
            ))}
          </div>
        </section>
      )}

      {/* Data confidence — the honesty layer */}
      <section className="mt-9">
        <DataConfidencePanel dc={state.dataConfidence} />
      </section>

      <footer className="mt-10 flex flex-col items-center gap-1 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
        <p>
          Deterministic risk engine · AI language layer ({summary.mode === "live" ? "GPT-4o live" : "cached fallback"}) ·
          Data source: {state.briefing.source}
        </p>
        <p>Snapshot as of {state.briefing.asOf} · figures are illustrative sample data</p>
      </footer>
    </div>
  );
}

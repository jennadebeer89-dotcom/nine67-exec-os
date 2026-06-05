import { getExecState } from "@/lib/engine";
import { getExecutiveSummary } from "@/lib/ai";
import { getPortfolioInsights } from "@/lib/ai/insights";
import { ExecSummary } from "@/components/exec-summary";
import { AskBar } from "@/components/ask-bar";
import { StatsRow } from "@/components/stats-row";
import { BriefingItemCard, CompactBriefingRow } from "@/components/briefing-item";
import { DataConfidencePanel } from "@/components/data-confidence";
import { WhatChangedPanel } from "@/components/trend";
import { AlertsBanner } from "@/components/alerts";
import { AIInsightsPanel } from "@/components/ai-insights";

export const dynamic = "force-dynamic";

export default async function BriefingPage() {
  const state = await getExecState();
  const [summary, insights] = await Promise.all([getExecutiveSummary(state), getPortfolioInsights(state)]);

  const items = state.briefing.items;
  const primary = items.filter((i) => i.score >= 38);
  const secondary = items.filter((i) => i.score < 38);
  const trendFor = (kind: string, refId: string) => state.trends.scoreByKey[`${kind}:${refId}`];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
      <ExecSummary text={summary.text} mode={summary.mode} asOf={state.briefing.asOf} />

      {/* Ask the business — prominent, directly under the summary */}
      <div className="mt-5">
        <AskBar />
      </div>

      <div className="mt-5">
        <StatsRow stats={state.briefing.stats} revenue={state.briefing.revenue} />
      </div>

      <div className="mt-5">
        <AlertsBanner counts={state.alertCounts} />
      </div>

      <div className="mt-5">
        <WhatChangedPanel trends={state.trends} />
      </div>

      {/* AI Insights — the AI reading the unstructured signal the numbers miss */}
      <div className="mt-5">
        <AIInsightsPanel insights={insights.insights} mode={insights.mode} />
      </div>

      {/* Primary attention list — top item emphasized */}
      <section className="mt-9">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-medium tracking-tight text-foreground">Needs attention now</h2>
          <span className="text-sm text-muted-foreground">{primary.length} items, ranked by risk</span>
        </div>
        <div className="space-y-3">
          {primary.map((item, i) => (
            <BriefingItemCard
              key={item.id}
              item={item}
              rank={i + 1}
              trend={trendFor(item.kind, item.refId)}
              featured={i === 0}
            />
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

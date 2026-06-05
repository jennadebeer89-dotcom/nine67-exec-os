import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightbulb, ListChecks, MessageSquareQuote, ScanSearch } from "lucide-react";
import { getExecState, type ExecState } from "@/lib/engine";
import type { AttentionItem } from "@/lib/engine/types";
import { explainItem } from "@/lib/ai";
import { getItemInsight, notesForItem } from "@/lib/ai/insights";
import { relatedNotes } from "@/lib/engine/signals";
import { fmtMoney } from "@/lib/format";
import { KIND_LABEL } from "@/lib/ui";
import { RiskBadge, ScoreMeter } from "@/components/risk-badge";
import { TrendBadge } from "@/components/trend";
import { MetricRow } from "@/components/metrics";
import { FactorCard } from "@/components/factor-card";
import { AIBadge } from "@/components/ai-badge";
import { DraftOutreach } from "@/components/draft-outreach";
import {
  BudgetDeliveryBar,
  RevenueExposureBar,
  RevenueLinesTable,
  UtilizationBars,
} from "@/components/viz";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getExecState();
  const item = state.briefing.items.find((i) => i.id === id);
  if (!item) notFound();

  const itemNotes = notesForItem(item, state);
  const [explanation, fieldRead] = await Promise.all([
    explainItem(item, state),
    itemNotes.length > 0 ? getItemInsight(item, state) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to briefing
      </Link>

      {/* Header */}
      <header className="mt-4">
        <div className="flex items-center gap-2">
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {KIND_LABEL[item.kind]}
          </span>
          <RiskBadge band={item.band} score={item.score} />
          <TrendBadge trend={state.trends.scoreByKey[`${item.kind}:${item.refId}`]} />
        </div>
        <h1 className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight text-foreground">
          {item.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{item.subtitle}</p>
        <div className="mt-4 max-w-xs">
          <ScoreMeter band={item.band} score={item.score} />
        </div>
      </header>

      {/* AI explanation + recommended action */}
      <section className="mt-6 grid gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:col-span-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Why this matters</h2>
            <AIBadge mode={explanation.mode} />
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{explanation.why}</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-accent/60 p-5 shadow-sm sm:col-span-2">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">Recommended action</h2>
          </div>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-foreground">{explanation.action}</p>
        </div>
      </section>

      {/* AI field read — what the qualitative notes say that the numbers don't */}
      {fieldRead && (
        <section className="mt-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-accent/50 to-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              The field read — between the lines
            </h2>
            <AIBadge mode={fieldRead.mode} />
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{fieldRead.read}</p>
        </section>
      )}

      {/* Metrics */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <MetricRow metrics={item.metrics} />
      </section>

      {/* AI-drafted outreach */}
      <div className="mt-4">
        <DraftOutreach itemId={item.id} />
      </div>

      {/* Kind-specific evidence visualization */}
      <EvidenceVisual item={item} state={state} />

      {/* Full factor breakdown */}
      <section className="mt-8">
        <h2 className="mb-1 font-display text-xl font-medium tracking-tight text-foreground">The evidence trail</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Every factor below is computed deterministically from the source data — the AI explains it, it
          doesn&apos;t decide it. Weights sum to the {item.score}/100 score.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {item.factors.map((f, i) => (
            <FactorCard key={i} factor={f} />
          ))}
        </div>
      </section>
    </div>
  );
}

async function EvidenceVisual({ item, state }: { item: AttentionItem; state: ExecState }) {
  const { dataset, briefing } = state;

  if (item.kind === "project") {
    const p = dataset.projects.find((x) => x.id === item.refId);
    if (!p) return null;
    const notes = relatedNotes(dataset.notes, { projectIds: [p.id], clientId: p.clientId ?? undefined });
    return (
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Budget vs delivery">
          <BudgetDeliveryBar
            burn={p.burnRatio}
            delivery={p.percentComplete}
            spent={p.spentWorstCase}
            budget={p.budget}
            conflict={p.hasBudgetConflict}
          />
          {p.budgetSources.length > 1 && (
            <div className="mt-4 space-y-1.5 border-t border-border/70 pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Spend by source</p>
              {p.budgetSources.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.source}</span>
                  <span className="tnum font-medium">{s.spent !== null ? fmtMoney(s.spent) : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Source updates">
          <NotesTimeline notes={notes.slice(0, 5)} />
        </Panel>
      </div>
    );
  }

  if (item.kind === "client") {
    const c = dataset.clients.find((x) => x.id === item.refId);
    if (!c) return null;
    const projects = dataset.projects.filter((p) => p.clientId === c.id);
    const notes = relatedNotes(dataset.notes, { clientId: c.id, projectIds: projects.map((p) => p.id) });
    return (
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Engagements under this account">
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <Link href={`/item/prj-${p.id}`} className="font-medium text-foreground hover:text-primary">
                  {p.name}
                </Link>
                <span className="tnum text-muted-foreground">
                  {p.hasBudgetConflict ? "spend conflict" : `${fmtMoney(p.spentWorstCase, { compact: true })}/${fmtMoney(p.budget, { compact: true })}`}
                </span>
              </li>
            ))}
            {projects.length === 0 && <li className="text-sm text-muted-foreground">No active projects on file.</li>}
          </ul>
        </Panel>
        <Panel title="Source updates">
          <NotesTimeline notes={notes.slice(0, 5)} />
        </Panel>
      </div>
    );
  }

  if (item.kind === "capacity") {
    const team = briefing.capacity.teams.find((t) => t.team === item.refId);
    if (!team) return null;
    return (
      <div className="mt-4 space-y-4">
        <Panel title={`${team.team} team load`}>
          <UtilizationBars people={team.people.filter((p) => p.allocatedHours > 0)} />
        </Panel>
        {team.contendedProjects.length > 0 && (
          <Panel title="Projects competing for the same people">
            <ul className="space-y-2">
              {team.contendedProjects.map((c) => (
                <li key={c.projectId} className="flex items-center justify-between text-sm">
                  <Link href={`/item/prj-${c.projectId}`} className="font-medium text-foreground hover:text-primary">
                    {c.name}
                  </Link>
                  <span className="tnum text-muted-foreground">{c.people} over-allocated people</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    );
  }

  if (item.kind === "revenue") {
    const r = briefing.revenue;
    return (
      <div className="mt-4 space-y-4">
        <Panel title={`Committed revenue — ${r.quarter}`}>
          <RevenueExposureBar committed={r.committedTotal} recognized={r.recognizedTotal} atRisk={r.atRiskTotal} />
        </Panel>
        <Panel title="Line-by-line">
          <RevenueLinesTable lines={r.lines} />
        </Panel>
      </div>
    );
  }

  return null;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function NotesTimeline({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return <p className="text-sm text-muted-foreground">No updates on file.</p>;
  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className="border-l-2 border-border pl-3">
          <div className="flex items-start gap-1.5">
            <MessageSquareQuote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            <p className="text-sm italic text-foreground/85">&ldquo;{n.text}&rdquo;</p>
          </div>
          <p className="mt-1 pl-4 text-xs text-muted-foreground">
            {n.author ?? "Unknown"} · {n.channel ?? "note"}
            {n.date ? ` · ${n.date}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

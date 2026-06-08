import Link from "next/link";
import { ArrowLeft, ShieldCheck, Gauge, Wallet, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { getExecState } from "@/lib/engine";
import { THRESHOLDS, AGENCY } from "@/lib/config";
import { fmtMoney, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business case & impact · Meridian Executive OS" };

/**
 * Business case & impact.
 *
 * Answers the question an enterprise buyer actually asks: "for anything we build,
 * what problem are we solving, what matters most, and how do we measure impact?"
 * Every figure here is derived live from the same deterministic engine the briefing
 * runs on — the impact story is grounded in the real snapshot, never asserted.
 */
export default async function ImpactPage() {
  const state = await getExecState();
  const { briefing, dataset } = state;
  const rev = briefing.revenue;

  // --- All metrics derived from engine state (nothing invented) ---
  const revenueAtRisk = rev.atRiskTotal;
  const budgetUnderMgmt = dataset.projects.reduce((s, p) => s + (p.budget ?? 0), 0);
  const marginFlags = dataset.projects.filter(
    (p) => (p.burnRatio !== null && p.burnRatio >= THRESHOLDS.budgetWarnRatio) || p.hasBudgetConflict,
  ).length;
  const overAllocated = briefing.stats.overAllocatedPeople;
  const conflictsCaught = dataset.issues.length;
  const entitiesScanned = dataset.clients.length + dataset.projects.length + dataset.notes.length;
  const SOURCE_SYSTEMS = 5; // CRM, PM tool, finance tracker, capacity sheet, status notes

  const kpis = [
    {
      icon: ShieldCheck,
      value: fmtMoney(revenueAtRisk, { compact: true }),
      label: "Revenue exposure surfaced",
      sub: `${fmtPct(rev.atRiskShare)} of ${fmtMoney(rev.committedTotal, { compact: true })} committed this quarter`,
      impact: "Revenue & EBITDA — exposed revenue flagged early enough to protect, defending both recognised revenue and the margin on it.",
      tone: "text-risk-high",
    },
    {
      icon: Wallet,
      value: fmtMoney(budgetUnderMgmt, { compact: true }),
      label: "Project budget under watch",
      sub: `${marginFlags} engagement${marginFlags === 1 ? "" : "s"} flagged for margin erosion`,
      impact: "Margin — budget leakage (overruns, scope creep, unreconciled spend) caught before it compounds into a write-down.",
      tone: "text-risk-medium",
    },
    {
      icon: Users,
      value: String(overAllocated),
      label: "People over capacity",
      sub: "surfaced before quality slips or burnout drives attrition",
      impact: "Utilisation & delivery — protects delivery quality and retention, and informs whether to re-staff, sequence, or hire.",
      tone: "text-risk-medium",
    },
    {
      icon: Gauge,
      value: `${SOURCE_SYSTEMS} → 1`,
      label: "Source systems into one read",
      sub: `${conflictsCaught} conflicts & gaps auto-reconciled across ${entitiesScanned} records`,
      impact: "Speed — removes the manual reconciliation latency between a problem existing and leadership acting on it.",
      tone: "text-primary",
    },
  ];

  const quantitative = [
    "Reduction in time leadership spends gathering and reconciling data before a decision (5 systems → one 60-second briefing).",
    "Earlier identification of at-risk projects and clients — lead time between a risk emerging and being acted on.",
    "Revenue at risk reduced per quarter, and improved client retention / renewal rates.",
    "Higher utilisation of existing people; fewer over-capacity periods and less budget leakage.",
  ];
  const qualitative = [
    "Increased leadership confidence in operational decisions — the read is explainable, not a black box.",
    "One shared view of the truth across delivery, finance, and client teams.",
    "Faster response to emerging risks, with less status-chasing and fewer meetings.",
    "Trust — the system is honest about where its own data is weak, so leadership knows when to lean in.",
  ];

  return (
    <div className="reveal mx-auto max-w-5xl px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to briefing
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Business case &amp; impact</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          What problem this solves, what matters most to leadership, and how we measure the return — quantitatively and
          qualitatively. Every figure below is computed live from the same engine the briefing runs on.
        </p>
      </header>

      {/* The problem we're solving */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-accent/60 to-card p-6 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">The problem we&apos;re solving</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          A growing agency has <span className="font-medium text-foreground">more operational data than it can use, and
          less visibility into what actually needs action.</span> The information is fragmented across a PM tool, finance
          tracker, CRM, capacity sheet, and a stream of status updates — so leadership spends its time gathering and
          reconciling before it can decide.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          The outcome isn&apos;t better reporting — it&apos;s <span className="font-medium text-foreground">faster, higher-quality
          leadership decisions.</span> {AGENCY.name} doesn&apos;t replace judgement; it removes the <em>latency</em> between a
          problem existing and leadership knowing about it. In an agency, that latency is where margin and clients are lost.
        </p>
      </section>

      {/* How we measure impact — quantitative KPI grid */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl font-medium tracking-tight text-foreground">How we measure impact</h2>
        </div>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          The metrics that flow through to revenue and EBITDA — each tied to a live number from this snapshot, not a
          hypothetical.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <k.icon className={`h-4 w-4 ${k.tone}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</span>
              </div>
              <div className={`tnum mt-2 font-display text-4xl font-semibold leading-none ${k.tone}`}>{k.value}</div>
              <p className="mt-1.5 text-xs text-muted-foreground">{k.sub}</p>
              <p className="mt-3 border-t border-border/60 pt-3 text-[13px] leading-relaxed text-foreground/85">{k.impact}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quantitative vs Qualitative */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <OutcomeCard title="Quantitative outcomes" items={quantitative} />
        <OutcomeCard title="Qualitative outcomes" items={qualitative} />
      </section>

      {/* ROI thesis */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">The ROI thesis</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">
          The primary value is helping leadership <span className="font-medium text-foreground">see issues earlier and act
          faster</span>: protecting revenue through earlier intervention on at-risk clients, reducing delivery overruns
          through capacity visibility, lifting utilisation of existing people, and cutting the management overhead spent
          manually consolidating information. In a real deployment these track through{" "}
          <span className="font-medium text-foreground">revenue retention, delivery performance, utilisation rates, and
          reporting efficiency</span> — the metrics that flow through to revenue and EBITDA.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4 text-sm">
          <Link href="/" className="font-medium text-primary hover:underline">See the live briefing →</Link>
          <Link href="/ask" className="font-medium text-primary hover:underline">Ask the business →</Link>
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Figures derived live from the engine snapshot ({briefing.asOf}). Sample data — illustrative of the methodology, not a real client.
      </p>
    </div>
  );
}

function OutcomeCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-foreground/85">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

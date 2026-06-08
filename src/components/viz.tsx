import { cn } from "@/lib/utils";
import { fmtMoney, fmtPct, fmtPctWhole } from "@/lib/format";
import type { PersonLoad, RevenueLine } from "@/lib/engine/types";

/** Budget-consumed vs delivery comparison — visualizes the gap that drives risk. */
export function BudgetDeliveryBar({
  burn,
  delivery,
  spent,
  budget,
  conflict,
}: {
  burn: number | null;
  delivery: number | null;
  spent: number | null;
  budget: number | null;
  conflict?: boolean;
}) {
  const burnPct = burn !== null ? Math.min(100, burn * 100) : null;
  const over = burn !== null && burn > 1;
  return (
    <div className="space-y-4">
      <Track
        label="Budget consumed"
        valueLabel={conflict ? "conflicting" : burn !== null ? fmtPctWhole(burn * 100) : "—"}
        pct={burnPct}
        sub={conflict ? "finance vs delivery disagree" : `${fmtMoney(spent)} of ${fmtMoney(budget)}`}
        tone={over ? "bad" : burn !== null && burn >= 0.85 ? "warn" : "ok"}
      />
      <Track
        label="Work delivered"
        valueLabel={delivery !== null ? fmtPctWhole(delivery) : "—"}
        pct={delivery}
        sub="self-reported completion"
        tone="neutral"
      />
      {burn !== null && delivery !== null && burn * 100 - delivery > 10 && (
        <p className="text-sm text-muted-foreground">
          Spend is{" "}
          <span className="font-semibold text-risk-high">
            {Math.round(burn * 100 - delivery)} points
          </span>{" "}
          ahead of delivered work — the gap that has to be closed on remaining budget.
        </p>
      )}
    </div>
  );
}

function Track({
  label,
  valueLabel,
  pct,
  sub,
  tone,
}: {
  label: string;
  valueLabel: string;
  pct: number | null;
  sub?: string;
  tone: "bad" | "warn" | "ok" | "neutral";
}) {
  const toneBg: Record<string, string> = {
    bad: "bg-risk-high",
    warn: "bg-risk-medium",
    ok: "bg-risk-low",
    neutral: "bg-primary",
  };
  const toneText: Record<string, string> = {
    bad: "text-risk-high",
    warn: "text-risk-medium",
    ok: "text-risk-low",
    neutral: "text-foreground",
  };
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={cn("tnum text-sm font-semibold", toneText[tone])}>{valueLabel}</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", toneBg[tone])} style={{ width: `${pct ?? 0}%` }} />
        {/* 100% marker */}
        <div className="absolute inset-y-0 right-0 w-px bg-border" />
      </div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Per-person utilization bars for a team. */
export function UtilizationBars({ people }: { people: PersonLoad[] }) {
  const max = Math.max(130, ...people.map((p) => (p.utilization ?? 0) * 100));
  return (
    <div className="space-y-3">
      {people.map((p) => {
        const util = p.utilization;
        const pct = util !== null ? util * 100 : null;
        const tone = util === null ? "neutral" : util > 1 ? "bad" : util > 0.9 ? "warn" : "ok";
        const toneBg: Record<string, string> = {
          bad: "bg-risk-high",
          warn: "bg-risk-medium",
          ok: "bg-risk-low",
          neutral: "bg-muted-foreground/40",
        };
        return (
          <div key={p.id} className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
              <div className="truncate text-xs text-muted-foreground">{p.role}</div>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
              {pct !== null ? (
                <div className={cn("h-full rounded-full", toneBg[tone])} style={{ width: `${(pct / max) * 100}%` }} />
              ) : (
                <div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,var(--color-border)_4px,var(--color-border)_8px)]" />
              )}
              <div className="absolute inset-y-0" style={{ left: `${(100 / max) * 100}%` }}>
                <div className="h-full w-px bg-foreground/30" />
              </div>
            </div>
            <span
              className={cn(
                "tnum w-14 text-right text-sm font-semibold",
                tone === "bad" ? "text-risk-high" : tone === "warn" ? "text-risk-medium" : "text-muted-foreground",
              )}
            >
              {util !== null ? fmtPct(util) : "unknown"}
            </span>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Vertical line marks 100% capacity.</p>
    </div>
  );
}

/** Segmented bar of committed revenue: recognized / at-risk / on-track remaining. */
export function RevenueExposureBar({
  committed,
  recognized,
  atRisk,
}: {
  committed: number;
  recognized: number;
  atRisk: number;
}) {
  const safe = Math.max(0, committed - recognized - atRisk);
  const seg = (v: number) => (committed > 0 ? (v / committed) * 100 : 0);
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-lg">
        <div className="bg-risk-low" style={{ width: `${seg(recognized)}%` }} title="Recognized" />
        <div className="bg-risk-high" style={{ width: `${seg(atRisk)}%` }} title="At risk" />
        <div className="bg-muted" style={{ width: `${seg(safe)}%` }} title="On-track, not yet recognized" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <Legend color="bg-risk-low" label="Recognized" value={fmtMoney(recognized, { compact: true })} />
        <Legend color="bg-risk-high" label="At risk" value={fmtMoney(atRisk, { compact: true })} />
        <Legend color="bg-muted" label="On track" value={fmtMoney(safe, { compact: true })} />
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="tnum font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function RevenueLinesTable({ lines }: { lines: RevenueLine[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Project</th>
            <th className="px-3 py-2 text-right font-medium">Committed</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((l, i) => {
            // Cash/AR risk is real but deliberately excluded from the at-risk
            // recognition total — render it amber + labelled so the table
            // reconciles to the headline figure rather than appearing to overshoot it.
            const isCash = l.riskType === "cash";
            const rowCls = isCash ? "bg-risk-medium-soft/30" : l.atRisk ? "bg-risk-high-soft/40" : "";
            return (
              <tr key={i} className={rowCls}>
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{l.projectName}</div>
                  <div className="text-xs text-muted-foreground">{l.clientName}</div>
                </td>
                <td className="tnum px-3 py-2 text-right font-semibold">{fmtMoney(l.committed, { compact: true })}</td>
                <td className="px-3 py-2">
                  {l.atRisk ? (
                    isCash ? (
                      <span className="text-risk-medium">
                        {l.riskReason}{" "}
                        <span className="text-xs italic text-muted-foreground">(cash/AR — not in at-risk total)</span>
                      </span>
                    ) : (
                      <span className="text-risk-high">{l.riskReason}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">On track</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

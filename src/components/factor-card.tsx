import { MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskFactor } from "@/lib/engine/types";

const KIND_LABEL: Record<RiskFactor["kind"], string> = {
  budget: "Budget",
  delivery: "Delivery",
  timeline: "Timeline",
  sentiment: "Sentiment",
  stale: "Freshness",
  renewal: "Renewal",
  capacity: "Capacity",
  payment: "Cash",
  data: "Data quality",
};

export function FactorCard({ factor }: { factor: RiskFactor }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {KIND_LABEL[factor.kind]}
          </span>
          <h3 className="mt-2 font-medium leading-snug text-foreground">{factor.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{factor.detail}</p>
        </div>
        <span className="tnum shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
          +{Math.round(factor.weight)}
        </span>
      </div>

      {factor.evidence.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Evidence</p>
          {factor.evidence.map((e, i) =>
            e.kind === "note" ? (
              <figure key={i} className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-start gap-2">
                  <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <blockquote className="text-sm italic text-foreground/85">&ldquo;{e.detail}&rdquo;</blockquote>
                </div>
                <figcaption className="mt-1.5 pl-5 text-xs text-muted-foreground">
                  {e.label}
                  {e.date ? ` · ${e.date}` : ""}
                </figcaption>
              </figure>
            ) : (
              <div
                key={i}
                className={cn(
                  "flex items-baseline justify-between gap-3 rounded-md px-3 py-1.5 text-sm",
                  e.kind === "conflict" ? "bg-risk-high-soft/50" : "bg-muted/40",
                )}
              >
                <span className="text-muted-foreground">{e.label}</span>
                <span className="tnum font-medium text-foreground">{e.detail}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

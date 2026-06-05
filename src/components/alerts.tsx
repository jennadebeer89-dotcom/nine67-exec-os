import Link from "next/link";
import { AlertOctagon, AlertTriangle, Info, ArrowRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/engine/alerts";

const SEV = {
  critical: { icon: AlertOctagon, text: "text-risk-high", soft: "bg-risk-high-soft", label: "Critical" },
  warning: { icon: AlertTriangle, text: "text-risk-medium", soft: "bg-risk-medium-soft", label: "Warning" },
  info: { icon: Info, text: "text-risk-watch", soft: "bg-risk-watch-soft", label: "Info" },
} as const;

const CATEGORY_LABEL: Record<Alert["category"], string> = {
  budget: "Budget", client: "Client", capacity: "Capacity", revenue: "Revenue", data: "Data", trend: "Trend",
};

/** Slim homepage banner — only shown when there are critical alerts. */
export function AlertsBanner({ counts }: { counts: { critical: number; warning: number } }) {
  if (counts.critical === 0) return null;
  return (
    <Link
      href="/alerts"
      className="group flex items-center justify-between gap-3 rounded-xl border border-risk-high/30 bg-risk-high-soft/60 px-4 py-3 transition-colors hover:bg-risk-high-soft"
    >
      <div className="flex items-center gap-2.5">
        <AlertOctagon className="h-4 w-4 text-risk-high" />
        <p className="text-sm font-medium text-foreground">
          <span className="tnum font-semibold text-risk-high">{counts.critical} critical</span>
          {counts.warning > 0 && <span className="text-muted-foreground"> · {counts.warning} warnings</span>} need attention
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-risk-high">
        View alerts
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="space-y-2.5">
      {alerts.map((a) => {
        const s = SEV[a.severity];
        const Icon = s.icon;
        const body = (
          <>
            <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", s.soft)}>
              <Icon className={cn("h-3.5 w-3.5", s.text)} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{a.title}</span>
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABEL[a.category]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{a.detail}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">Triggered by: {a.rule}</p>
            </div>
            {a.itemId && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
          </>
        );
        return a.itemId ? (
          <Link
            key={a.id}
            href={`/item/${a.itemId}`}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            {body}
          </Link>
        ) : (
          <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Nav bell with a count badge. */
export function AlertBell({ count }: { count: number }) {
  return (
    <Link
      href="/alerts"
      className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={`${count} active alerts`}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="tnum absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-high px-1 text-[9px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

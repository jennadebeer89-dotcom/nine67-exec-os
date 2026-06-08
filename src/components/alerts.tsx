"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertOctagon, AlertTriangle, Info, ArrowRight, Bell, Check, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/engine/alerts";

// ---------------------------------------------------------------------------
// Acknowledged-alerts store (browser localStorage).
//
// Alerts reflect conditions that are still TRUE (e.g. "over budget"), so merely
// reading them shouldn't clear them — that's why the count never dropped before.
// Instead, leadership can *acknowledge* an alert to take it off the count. Acks
// persist on the device and sync live across the nav bell, homepage banner, and
// the alerts list. Acknowledged ≠ resolved — it's "I've seen this, hide it."
// ---------------------------------------------------------------------------
const ACK_KEY = "meridian:ack-alerts";
const ACK_EVENT = "meridian:ack-change";

function readAck(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ACK_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeAck(set: Set<string>) {
  try {
    window.localStorage.setItem(ACK_KEY, JSON.stringify([...set]));
  } catch {
    /* storage disabled / quota — degrade silently */
  }
  window.dispatchEvent(new Event(ACK_EVENT));
}

function useAck() {
  // Start empty so SSR and the first client render match; hydrate in the effect.
  const [ack, setAck] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const sync = () => setAck(readAck());
    sync();
    window.addEventListener(ACK_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACK_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const acknowledge = useCallback((id: string) => {
    const s = readAck();
    s.add(id);
    writeAck(s);
  }, []);
  const restore = useCallback((id: string) => {
    const s = readAck();
    s.delete(id);
    writeAck(s);
  }, []);
  const restoreAll = useCallback((ids: string[]) => {
    const s = readAck();
    ids.forEach((id) => s.delete(id));
    writeAck(s);
  }, []);

  return { ack, acknowledge, restore, restoreAll };
}

const SEV = {
  critical: { icon: AlertOctagon, text: "text-risk-high", soft: "bg-risk-high-soft", label: "Critical" },
  warning: { icon: AlertTriangle, text: "text-risk-medium", soft: "bg-risk-medium-soft", label: "Warning" },
  info: { icon: Info, text: "text-risk-watch", soft: "bg-risk-watch-soft", label: "Info" },
} as const;

const CATEGORY_LABEL: Record<Alert["category"], string> = {
  budget: "Budget", client: "Client", capacity: "Capacity", revenue: "Revenue", data: "Data", trend: "Trend",
};

/** Nav bell with a live count of *unacknowledged* actionable alerts. */
export function AlertBell({ actionableIds }: { actionableIds: string[] }) {
  const { ack } = useAck();
  const count = actionableIds.filter((id) => !ack.has(id)).length;
  return (
    <Link
      href="/alerts"
      className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={`${count} active alert${count === 1 ? "" : "s"}`}
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

/** Slim homepage banner — only shown while unacknowledged critical alerts remain. */
export function AlertsBanner({ criticalIds, warningIds }: { criticalIds: string[]; warningIds: string[] }) {
  const { ack } = useAck();
  const critical = criticalIds.filter((id) => !ack.has(id)).length;
  const warning = warningIds.filter((id) => !ack.has(id)).length;
  if (critical === 0) return null;
  return (
    <Link
      href="/alerts"
      className="group flex items-center justify-between gap-3 rounded-xl border border-risk-high/30 bg-risk-high-soft/60 px-4 py-3 transition-colors hover:bg-risk-high-soft"
    >
      <div className="flex items-center gap-2.5">
        <AlertOctagon className="h-4 w-4 text-risk-high" />
        <p className="text-sm font-medium text-foreground">
          <span className="tnum font-semibold text-risk-high">{critical} critical</span>
          {warning > 0 && <span className="text-muted-foreground"> · {warning} warnings</span>} need attention
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-risk-high">
        View alerts
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/** Full alerts surface: severity chips + active list + an acknowledged section. */
export function AlertsView({ alerts }: { alerts: Alert[] }) {
  const { ack, acknowledge, restore, restoreAll } = useAck();
  const active = alerts.filter((a) => !ack.has(a.id));
  const acked = alerts.filter((a) => ack.has(a.id));
  const n = (sev: Alert["severity"]) => active.filter((a) => a.severity === sev).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <Chip icon={AlertOctagon} n={n("critical")} label="Critical" cls="bg-risk-high-soft text-risk-high" />
        <Chip icon={AlertTriangle} n={n("warning")} label="Warning" cls="bg-risk-medium-soft text-risk-medium" />
        <Chip icon={Info} n={n("info")} label="Info" cls="bg-risk-watch-soft text-risk-watch" />
        {acked.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{acked.length} acknowledged</span>
        )}
      </div>

      {active.length > 0 ? (
        <div className="space-y-2.5">
          {active.map((a) => (
            <AlertRow key={a.id} alert={a} onAction={() => acknowledge(a.id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          All alerts acknowledged — nothing outstanding right now.
        </div>
      )}

      {acked.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Acknowledged ({acked.length})
            </h2>
            <button
              type="button"
              onClick={() => restoreAll(acked.map((a) => a.id))}
              className="text-xs font-medium text-primary hover:underline"
            >
              Restore all
            </button>
          </div>
          <div className="space-y-2.5">
            {acked.map((a) => (
              <AlertRow key={a.id} alert={a} acknowledged onAction={() => restore(a.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Chip({
  icon: Icon,
  n,
  label,
  cls,
}: {
  icon: React.ComponentType<{ className?: string }>;
  n: number;
  label: string;
  cls: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium", cls)}>
      <Icon className="h-4 w-4" />
      <span className="tnum">{n}</span> {label}
    </span>
  );
}

function AlertRow({
  alert: a,
  acknowledged = false,
  onAction,
}: {
  alert: Alert;
  acknowledged?: boolean;
  onAction: () => void;
}) {
  const s = SEV[a.severity];
  const Icon = s.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all",
        acknowledged ? "opacity-60" : "hover:border-primary/30 hover:shadow-md",
      )}
    >
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", s.soft)}>
        <Icon className={cn("h-3.5 w-3.5", s.text)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {a.itemId ? (
            <Link href={`/item/${a.itemId}`} className="font-medium text-foreground transition-colors hover:text-primary">
              {a.title}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{a.title}</span>
          )}
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABEL[a.category]}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{a.detail}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">Triggered by: {a.rule}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={acknowledged ? "Restore to active alerts" : "Acknowledge and remove from count"}
      >
        {acknowledged ? <Undo2 className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        {acknowledged ? "Restore" : "Dismiss"}
      </button>
    </div>
  );
}

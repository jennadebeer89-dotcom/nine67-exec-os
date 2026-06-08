import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getExecState } from "@/lib/engine";
import { AlertsView } from "@/components/alerts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alerts · Meridian Executive OS" };

export default async function AlertsPage() {
  const { alerts } = await getExecState();

  return (
    <div className="reveal mx-auto max-w-4xl px-5 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to briefing
      </Link>

      <div className="mt-4 mb-5">
        <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Alerts</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Threshold-triggered notifications across budget, clients, capacity, revenue, data quality, and
          week-over-week movement. Each names the rule that fired and links to the underlying detail. Dismiss one to
          take it off your count — it stays acknowledged on this device until the condition is genuinely resolved.
        </p>
      </div>

      <AlertsView alerts={alerts} />

      <p className="mt-6 text-xs text-muted-foreground">
        Rules and thresholds are defined in <code className="rounded bg-muted px-1">src/lib/config.ts</code> and{" "}
        <code className="rounded bg-muted px-1">src/lib/engine/alerts.ts</code> — in a real deployment these would be
        owned and tuned by leadership, and could push to email or Slack.
      </p>
    </div>
  );
}

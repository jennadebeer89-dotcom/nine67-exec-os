import { cn } from "@/lib/utils";
import type { Metric } from "@/lib/engine/types";
import { TONE_TEXT } from "@/lib/ui";

export function MetricRow({ metrics, className }: { metrics: Metric[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4", className)}>
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0">
          <dt className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</dt>
          <dd className={cn("tnum mt-0.5 truncate text-sm font-semibold", TONE_TEXT[m.tone ?? "neutral"])}>
            {m.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

import { AIBadge } from "@/components/ai-badge";
import type { AIMode } from "@/lib/ai";

export function ExecSummary({ text, mode, asOf }: { text: string; mode: AIMode; asOf: string }) {
  const date = new Date(asOf + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <section className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            This week&apos;s briefing
          </span>
          <AIBadge mode={mode} />
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      <h1 className="mt-1.5 font-display text-lg font-medium leading-snug tracking-tight text-foreground">
        What leadership should focus on this week
      </h1>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{text}</p>
    </section>
  );
}

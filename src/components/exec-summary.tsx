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
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Executive Briefing
          </span>
          <AIBadge mode={mode} />
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      <h1 className="mt-3 font-display text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-[28px]">
        What leadership should focus on this week
      </h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-foreground/85">{text}</p>
    </section>
  );
}

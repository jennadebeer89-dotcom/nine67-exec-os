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
    <section className="reveal relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-5 shadow-sm sm:px-7 sm:py-6">
      {/* slim accent rule at the top edge */}
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/40 via-primary/15 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            This week&apos;s briefing
          </span>
          <AIBadge mode={mode} />
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      <h1 className="mt-3 font-display text-sm font-medium italic leading-snug text-muted-foreground">
        What leadership should focus on this week
      </h1>
      <p className="mt-2 max-w-3xl font-display text-xl font-normal leading-relaxed text-foreground sm:text-[1.45rem] sm:leading-relaxed">
        {text}
      </p>
    </section>
  );
}

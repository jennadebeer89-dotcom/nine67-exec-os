import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

const STARTERS = [
  "What should I focus on this week?",
  "Which clients are most at risk?",
  "What revenue is at risk this quarter?",
  "Where are we over capacity?",
];

/**
 * Prominent "ask the business" entry point — styled like a live chat/search bar so
 * it reads as the primary interactive surface of the product.
 */
export function AskBar() {
  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-accent/70 to-card p-4 shadow-sm sm:p-5">
      <Link
        href="/ask"
        className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-foreground">Ask the business anything</p>
          <p className="truncate text-sm text-muted-foreground">
            A conversational read on the whole operation — grounded in live data
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity group-hover:opacity-90 sm:inline-flex">
          Ask
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {STARTERS.map((s) => (
          <Link
            key={s}
            href="/ask"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card hover:text-foreground"
          >
            {s}
          </Link>
        ))}
      </div>
    </section>
  );
}

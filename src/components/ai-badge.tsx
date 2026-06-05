import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

/** Small badge that's honest about whether output is live AI or cached fallback. */
export function AIBadge({ mode, className }: { mode: "live" | "fallback"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        mode === "live"
          ? "border-primary/25 bg-accent text-accent-foreground"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
      title={mode === "live" ? "Generated live by GPT-4o" : "Pre-computed fallback (no live key) — still grounded in the data"}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {mode === "live" ? "Live AI" : "AI · cached"}
    </span>
  );
}

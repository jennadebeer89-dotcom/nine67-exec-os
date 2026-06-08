import { cn } from "@/lib/utils";
import type { RiskBand } from "@/lib/types";
import { BAND_BG, BAND_LABEL, bandPill } from "@/lib/ui";

export function RiskDot({ band, className }: { band: RiskBand; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", BAND_BG[band], className)} />;
}

export function RiskBadge({ band, score, className }: { band: RiskBand; score?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        bandPill(band),
        className,
      )}
    >
      <RiskDot band={band} />
      {BAND_LABEL[band]}
      {typeof score === "number" && <span className="tnum">· {score}</span>}
    </span>
  );
}

/** Thin score meter, 0–100. */
export function ScoreMeter({ band, score, className }: { band: RiskBand; score: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full", BAND_BG[band])} style={{ width: `${Math.max(4, score)}%` }} />
    </div>
  );
}

import type { RiskBand } from "./types";
import type { Metric } from "./engine/types";

export const BAND_LABEL: Record<RiskBand, string> = {
  high: "High risk",
  medium: "Medium risk",
  watch: "Watch",
  capacity: "Capacity",
  low: "Low",
};

/** Foreground text/dot color class per band. */
export const BAND_TEXT: Record<RiskBand, string> = {
  high: "text-risk-high",
  medium: "text-risk-medium",
  watch: "text-risk-watch",
  capacity: "text-risk-capacity",
  low: "text-risk-low",
};

/** Solid background (for dots / accent bars). */
export const BAND_BG: Record<RiskBand, string> = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  watch: "bg-risk-watch",
  capacity: "bg-risk-capacity",
  low: "bg-risk-low",
};

/** Soft pill background per band. */
export const BAND_SOFT: Record<RiskBand, string> = {
  high: "bg-risk-high-soft",
  medium: "bg-risk-medium-soft",
  watch: "bg-risk-watch-soft",
  capacity: "bg-risk-capacity-soft",
  low: "bg-risk-low-soft",
};

export function bandPill(band: RiskBand): string {
  return `${BAND_SOFT[band]} ${BAND_TEXT[band]}`;
}

export const TONE_TEXT: Record<NonNullable<Metric["tone"]>, string> = {
  bad: "text-risk-high",
  warn: "text-risk-medium",
  ok: "text-risk-low",
  neutral: "text-foreground",
};

export const KIND_LABEL: Record<string, string> = {
  project: "Project",
  client: "Client",
  capacity: "Capacity",
  revenue: "Revenue",
};

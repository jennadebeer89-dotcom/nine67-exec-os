/**
 * Global configuration and the single source of "now" for the whole system.
 *
 * IMPORTANT: the dataset is a fixed snapshot. We deliberately do NOT use the real
 * wall clock for staleness / renewal / quarter math — otherwise the demo would
 * drift (every project would read as "stale" a month from now). All time-relative
 * reasoning anchors to DATA_AS_OF so the briefing is identical whenever it's viewed.
 */
export const AGENCY = {
  name: "Meridian",
  tagline: "Digital product & growth agency",
} as const;

/** The snapshot date the data represents. Treated as "today" by the engine. */
export const DATA_AS_OF = "2026-06-05";

/** Current fiscal quarter for revenue reasoning, derived from DATA_AS_OF. */
export const CURRENT_QUARTER = "Q2-2026";

/** Thresholds the deterministic engine uses. Centralised so they're explainable. */
export const THRESHOLDS = {
  staleDays: 21, // a project untouched this long is "stale"
  silentClientDays: 21, // no client contact this long is a relationship risk
  renewalSoonDays: 90, // renewals within this window warrant attention
  renewalUrgentDays: 60, // renewals within this window are urgent
  budgetWarnRatio: 0.85, // spend/budget over this is a margin warning
  budgetCriticalRatio: 0.95, // spend/budget over this is critical
  // a project is "burning ahead of delivery" when burn% exceeds delivery% by this much
  burnAheadOfDeliveryGap: 0.15,
} as const;

import type { RawForecast } from "./types";

/**
 * Revenue forecast sheet — quarterly commitments leadership reports upward.
 * Current quarter context: Q2-2026 (the dataset as-of is 2026-06-05).
 *
 * Mess intentionally present:
 *  - confidence as words, a %, and missing
 *  - Atlas mobile commitment is booked into Q2 but delivery is slipping to Q3 (at risk)
 *  - Sundial is forecast despite the project possibly being paused (soft commitment)
 *  - Helix revenue is contingent on a renewal that may not happen
 */
export const RAW_FORECASTS: RawForecast[] = [
  { project_id: "p05", client_id: "c04", quarter: "Q2-2026", committed_revenue: "$420,000", recognized_to_date: "$210,000", confidence: "High", note: "Tied to Phase 1 launch milestone — at risk of slipping to July (Q3)." },
  { project_id: "p01", client_id: "c01", quarter: "Q2-2026", committed_revenue: "$300,000", recognized_to_date: "$240,000", confidence: "Medium", note: "Depends on hitting July delivery; budget already stretched." },
  { project_id: "p03", client_id: "c02", quarter: "Q2-2026", committed_revenue: "$180,000", recognized_to_date: "$150,000", confidence: "Low", note: "Contingent on renewal; champion left." },
  { project_id: "p11", client_id: "c09", quarter: "Q2-2026", committed_revenue: "$70,000", recognized_to_date: "$40,000", confidence: "", note: "Forecast still in the sheet even though the project may be paused." },
  { project_id: "p10", client_id: "c08", quarter: "Q2-2026", committed_revenue: "$150,000", recognized_to_date: "$90,000", confidence: "Medium", note: "Budget reconciliation unresolved — recognized figure uncertain." },
  { project_id: "p07", client_id: "c05", quarter: "Q2-2026", committed_revenue: "$60,000", recognized_to_date: "$55,000", confidence: "High", note: "Brand refresh near complete." },
  { project_id: "p06", client_id: "c04", quarter: "Q2-2026", committed_revenue: "$120,000", recognized_to_date: "$110,000", confidence: "90%", note: "On plan." },
  { project_id: "p12", client_id: "c11", quarter: "Q2-2026", committed_revenue: "$110,000", recognized_to_date: "$95,000", confidence: "High", note: "Orbit dashboard." },
  { project_id: "p13", client_id: "c11", quarter: "Q2-2026", committed_revenue: "$80,000", recognized_to_date: "$60,000", confidence: "Medium", note: "Orbit portal — depends on design capacity holding." },
  { project_id: "p08", client_id: "c06", quarter: "Q2-2026", committed_revenue: "$90,000", recognized_to_date: "$70,000", confidence: "Low", note: "Margin eroding from unpaid scope." },
  { project_id: "p15", client_id: "c12", quarter: "Q2-2026", committed_revenue: "$70,000", recognized_to_date: "$55,000", confidence: "Medium", note: "Delivery fine; cash at risk — client 75 days late paying." },
];

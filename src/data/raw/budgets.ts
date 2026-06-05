import type { RawBudgetRecord } from "./types";

/**
 * Finance budget tracker — the money team's spreadsheet, kept separately from the
 * PM tool. Mostly it agrees with the project records; sometimes it doesn't.
 *
 * The headline conflict: Harborline (p10). The PM tool reports ~540k spent; finance
 * reports 720k. Both are "official." The engine must NOT silently pick one — it
 * surfaces the conflict and reasons about the worse case.
 */
export const RAW_BUDGET_RECORDS: RawBudgetRecord[] = [
  // Harborline — the conflict (two sources, two numbers)
  { project_id: "p10", source: "PM Export", budget: "$900,000", spent: "$540,000", as_of: "2026-05-27" },
  { project_id: "p10", source: "Finance Tracker", budget: "900000", spent: "720000", as_of: "2026-05-31" },

  // A few finance confirmations that corroborate the project records
  { project_id: "p01", source: "Finance Tracker", budget: "850000", spent: "784500", as_of: "2026-06-01" }, // ~matches PM (slightly higher)
  { project_id: "p03", source: "Finance Tracker", budget: "600000", spent: "675000", as_of: "2026-06-02" }, // confirms overrun
  { project_id: "p08", source: "Finance Tracker", budget: "680000", spent: "525000", as_of: "2026-05-31" }, // slightly higher than PM

  // Lumen — finance has the budget the PM tool is missing (so the gap is fillable)
  { project_id: "p09", source: "Client SOW", budget: "$360,000", as_of: "2026-04-20" },
];

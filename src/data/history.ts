import {
  RAW_ALLOCATIONS,
  RAW_BUDGET_RECORDS,
  RAW_CLIENTS,
  RAW_EMPLOYEES,
  RAW_FORECASTS,
  RAW_NOTES,
  RAW_PROJECTS,
} from "./raw";
import type {
  RawAllocation,
  RawBudgetRecord,
  RawForecast,
  RawProject,
} from "./raw/types";

/**
 * Prior-week snapshot reconstruction.
 *
 * Trend detection needs history. Rather than fabricate a parallel dataset, we
 * rewind a handful of real values to where they were a week ago (PRIOR_AS_OF) and
 * run the SAME engine over them. The deltas are therefore genuine — same scoring,
 * two points in time — not hand-written "trend" text.
 *
 * What we rewind (everything else is unchanged and re-evaluated at the prior date):
 *  - Prime & Helix had burned less budget last week (the burn accelerated this week)
 *  - Atlas's launch was still "on track" last week (the Q3 slip surfaced this week)
 *  - the Design pod was less loaded last week (Orbit portal ramped up since)
 *  - status notes are filtered to those that existed on or before the prior date
 *
 * Several trends emerge for free from the date shift alone — e.g. Northwind crosses
 * the 21-day "silent client" line this week, and renewals tick closer.
 */
export const PRIOR_AS_OF = "2026-05-29";

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

export function buildPriorRaw() {
  // Projects — Prime & Helix had burned less and delivered slightly less.
  const projects: RawProject[] = clone(RAW_PROJECTS);
  patch(projects, "p01", { spent: "660,000", percent_complete: "62", last_update: "2026-05-25" });
  patch(projects, "p03", { spent: "630000", percent_complete: "76", last_update: "2026-05-26" });

  // Budget tracker — keep finance roughly in step with the prior PM spend so we don't
  // invent a conflict that didn't exist last week (Harborline's conflict DID exist).
  const budgets: RawBudgetRecord[] = clone(RAW_BUDGET_RECORDS);
  patchBudget(budgets, "p01", "Finance Tracker", { spent: "661000" });
  patchBudget(budgets, "p03", "Finance Tracker", { spent: "632000" });

  // Forecasts — Atlas was still tracking to the Q2 date last week (no slip yet),
  // so its $420k was NOT at risk a week ago.
  const forecasts: RawForecast[] = clone(RAW_FORECASTS);
  patchForecast(forecasts, "p05", {
    confidence: "High",
    recognized_to_date: "$185,000",
    note: "On track for the end-of-Q2 launch milestone.",
  });

  // Allocations — the Orbit self-service portal (p13) ramped up this week, tipping the
  // Design pod further over capacity. Last week fewer hours were booked on it.
  const allocations: RawAllocation[] = clone(RAW_ALLOCATIONS);
  patchAlloc(allocations, "e09", "p13", { allocated_hours: 12 }); // Elena 48 -> 44h
  patchAlloc(allocations, "e10", "p13", { allocated_hours: 12 }); // Maya 44 -> 40h
  patchAlloc(allocations, "e11", "p13", { allocated_hours: 16 }); // Noah 40 -> 36h

  // Notes — only those that existed on or before the prior date.
  const notes = RAW_NOTES.filter((n) => !n.date || String(n.date) <= PRIOR_AS_OF);

  return {
    clients: clone(RAW_CLIENTS),
    projects,
    employees: clone(RAW_EMPLOYEES),
    allocations,
    notes,
    budgets,
    forecasts,
  };
}

// --- tiny patch helpers ---
function patch(arr: RawProject[], id: string, fields: Partial<RawProject>) {
  const p = arr.find((x) => x.id === id);
  if (p) Object.assign(p, fields);
}
function patchBudget(arr: RawBudgetRecord[], projectId: string, source: string, fields: Partial<RawBudgetRecord>) {
  const b = arr.find((x) => x.project_id === projectId && x.source === source);
  if (b) Object.assign(b, fields);
}
function patchForecast(arr: RawForecast[], projectId: string, fields: Partial<RawForecast>) {
  const f = arr.find((x) => x.project_id === projectId);
  if (f) Object.assign(f, fields);
}
function patchAlloc(arr: RawAllocation[], employeeId: string, projectId: string, fields: Partial<RawAllocation>) {
  const a = arr.find((x) => x.employee_id === employeeId && x.project_id === projectId);
  if (a) Object.assign(a, fields);
}

/**
 * Data access layer. The single entry point the engine, AI, and UI all call.
 *
 * Source of truth:
 *   - Supabase, when env is configured (the "real deployable system").
 *   - The in-repo messy source modules otherwise (so the app always runs).
 *
 * Either way the rows are messy and flow through the same normalize() pipeline,
 * so the Data Confidence story is identical regardless of source.
 */
import { DATA_AS_OF } from "./config";
import { normalize } from "./normalize";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Dataset } from "./types";
import {
  RAW_ALLOCATIONS,
  RAW_BUDGET_RECORDS,
  RAW_CLIENTS,
  RAW_EMPLOYEES,
  RAW_FORECASTS,
  RAW_NOTES,
  RAW_PROJECTS,
} from "@/data/raw";

function buildLocal(): Dataset {
  const n = normalize({
    clients: RAW_CLIENTS,
    projects: RAW_PROJECTS,
    employees: RAW_EMPLOYEES,
    allocations: RAW_ALLOCATIONS,
    notes: RAW_NOTES,
    budgets: RAW_BUDGET_RECORDS,
    forecasts: RAW_FORECASTS,
  });
  return { ...n, source: "local", asOf: DATA_AS_OF };
}

async function buildFromSupabase(): Promise<Dataset> {
  const sb = getSupabase();
  if (!sb) return buildLocal();
  try {
    const [clients, projects, employees, allocations, notes, budgets, forecasts] =
      await Promise.all([
        sb.from("clients").select("*"),
        sb.from("projects").select("*"),
        sb.from("employees").select("*"),
        sb.from("allocations").select("*"),
        sb.from("notes").select("*"),
        sb.from("budget_records").select("*"),
        sb.from("forecasts").select("*"),
      ]);
    const anyError =
      clients.error || projects.error || employees.error || allocations.error ||
      notes.error || budgets.error || forecasts.error;
    if (anyError || !projects.data?.length) {
      console.warn("[data] Supabase read failed or empty; using local data.", anyError?.message);
      return buildLocal();
    }
    const n = normalize({
      clients: clients.data as never,
      projects: projects.data as never,
      employees: employees.data as never,
      allocations: allocations.data as never,
      notes: notes.data as never,
      budgets: budgets.data as never,
      forecasts: forecasts.data as never,
    });
    return { ...n, source: "supabase", asOf: DATA_AS_OF };
  } catch (err) {
    console.warn("[data] Supabase error; using local data.", (err as Error).message);
    return buildLocal();
  }
}

let cached: Promise<Dataset> | null = null;

/** Returns the normalized dataset (cached for the process lifetime). */
export function getDataset(): Promise<Dataset> {
  if (!cached) {
    cached = isSupabaseConfigured() ? buildFromSupabase() : Promise.resolve(buildLocal());
  }
  return cached;
}

/** Force a rebuild (used by scripts / dev). */
export function clearDatasetCache() {
  cached = null;
}

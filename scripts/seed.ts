/**
 * Seed Supabase with the messy source data.
 *
 *   pnpm seed
 *
 * Idempotent: keyed tables upsert on id; serial-id tables are cleared and reloaded.
 * Every value is written as text so the inconsistencies survive into the database
 * exactly as authored. Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  RAW_ALLOCATIONS,
  RAW_BUDGET_RECORDS,
  RAW_CLIENTS,
  RAW_EMPLOYEES,
  RAW_FORECASTS,
  RAW_NOTES,
  RAW_PROJECTS,
} from "../src/data/raw";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "\n✗ Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n",
  );
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

/** Coerce every field to text-or-null so it lands cleanly in TEXT columns. */
function toText(rows: readonly object[]): Record<string, string | null>[] {
  return rows.map((row) => {
    const out: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v === undefined || v === null ? null : String(v);
    }
    return out;
  });
}

async function upsert(table: string, rows: readonly object[]) {
  const { error } = await sb.from(table).upsert(toText(rows), { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ✓ ${table.padEnd(15)} ${rows.length} rows (upsert)`);
}

async function replace(table: string, rows: readonly object[]) {
  const del = await sb.from(table).delete().neq("id", -1);
  if (del.error) throw new Error(`${table} clear: ${del.error.message}`);
  const { error } = await sb.from(table).insert(toText(rows));
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ✓ ${table.padEnd(15)} ${rows.length} rows (replace)`);
}

async function main() {
  console.log(`\nSeeding Supabase at ${url}\n`);
  await upsert("clients", RAW_CLIENTS);
  await upsert("projects", RAW_PROJECTS);
  await upsert("employees", RAW_EMPLOYEES);
  await upsert("notes", RAW_NOTES);
  await replace("allocations", RAW_ALLOCATIONS);
  await replace("budget_records", RAW_BUDGET_RECORDS);
  await replace("forecasts", RAW_FORECASTS);
  console.log("\n✓ Seed complete.\n");
}

main().catch((e) => {
  console.error("\n✗ Seed failed:", e.message, "\n");
  process.exit(1);
});

import { describe, it, expect } from "vitest";
import { parseMoney, parseDateISO, parsePercent, normalize } from "./normalize";
import {
  RAW_CLIENTS, RAW_PROJECTS, RAW_EMPLOYEES, RAW_ALLOCATIONS,
  RAW_NOTES, RAW_BUDGET_RECORDS, RAW_FORECASTS,
} from "@/data/raw";

// One normalize() over the real (intentionally messy) dataset, reused by the suite.
const ds = normalize({
  clients: RAW_CLIENTS, projects: RAW_PROJECTS, employees: RAW_EMPLOYEES,
  allocations: RAW_ALLOCATIONS, notes: RAW_NOTES, budgets: RAW_BUDGET_RECORDS, forecasts: RAW_FORECASTS,
});

describe("primitive parsers tolerate the documented mess", () => {
  it("parses money in $, plain, and k forms", () => {
    expect(parseMoney("$1,200,000")).toBe(1_200_000);
    expect(parseMoney("120000")).toBe(120_000);
    expect(parseMoney("120k")).toBe(120_000);
    expect(parseMoney("95k")).toBe(95_000);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
  });

  it("parses ISO and DD/MM/YYYY, but refuses to guess 'Q4' or 'Mar 3'", () => {
    expect(parseDateISO("2026-03-14")).toBe("2026-03-14");
    expect(parseDateISO("31/07/2026")).toBe("2026-07-31");
    expect(parseDateISO("Q4")).toBeNull();
    expect(parseDateISO("Mar 3")).toBeNull();
  });

  it("parses percent as whole, with %, and as a decimal", () => {
    expect(parsePercent("65")).toBe(65);
    expect(parsePercent("80%")).toBe(80);
    expect(parsePercent(0.45)).toBe(45);
    expect(parsePercent("")).toBeNull();
  });
});

describe("normalize surfaces the mess instead of hiding it", () => {
  it("keeps BOTH conflicting spend figures and reasons from the worst case", () => {
    const p10 = ds.projects.find((p) => p.id === "p10")!; // Harborline: PM 540k vs Finance 720k
    expect(p10.hasBudgetConflict).toBe(true);
    expect(p10.spentWorstCase).toBe(720_000);
    expect(p10.spent).toBeNull(); // genuinely unknown — not silently picked
  });

  it("recovers a missing PM budget from finance and logs the recovery", () => {
    const p09 = ds.projects.find((p) => p.id === "p09")!; // Lumen: PM budget blank
    expect(p09.budget).toBe(360_000);
    expect(ds.issues.some((i) => i.kind === "recovered" && i.entityId === "p09")).toBe(true);
  });

  it("detects a note that references a non-existent project as an orphan", () => {
    expect(ds.issues.some((i) => i.kind === "orphan")).toBe(true);
  });

  it("parses an ambiguous status cautiously rather than guessing", () => {
    const p11 = ds.projects.find((p) => p.id === "p11")!; // status "Paused?"
    expect(p11.status).toBe("paused");
    expect(p11.statusAmbiguous).toBe(true);
  });

  it("leaves capacity unknowable when it isn't recorded (no assumed 40h)", () => {
    const e19 = ds.employees.find((e) => e.id === "e19")!; // blank capacity
    expect(e19.weeklyCapacity).toBeNull();
  });

  it("skips renewal-window math when the date is unparseable ('Q4')", () => {
    const vertex = ds.clients.find((c) => c.id === "c06")!; // renewal_date "Q4"
    expect(vertex.renewalDate).toBeNull();
    expect(vertex.renewalInDays).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { normalize } from "../normalize";
import { DATA_AS_OF } from "../config";
import { scoreToBand, scoreProject } from "./risk";
import { buildBriefing, scoreAll } from "./attention";
import { buildRevenue } from "./revenue";
import { buildCapacity } from "./capacity";
import { buildDataConfidence } from "./dataConfidence";
import {
  RAW_CLIENTS, RAW_PROJECTS, RAW_EMPLOYEES, RAW_ALLOCATIONS,
  RAW_NOTES, RAW_BUDGET_RECORDS, RAW_FORECASTS,
} from "@/data/raw";
import type { Dataset } from "../types";

const ds: Dataset = {
  ...normalize({
    clients: RAW_CLIENTS, projects: RAW_PROJECTS, employees: RAW_EMPLOYEES,
    allocations: RAW_ALLOCATIONS, notes: RAW_NOTES, budgets: RAW_BUDGET_RECORDS, forecasts: RAW_FORECASTS,
  }),
  source: "local",
  asOf: DATA_AS_OF,
};

const { projectScores, clientScores } = scoreAll(ds);

describe("risk banding is stable at the documented thresholds", () => {
  it("maps scores to bands", () => {
    expect(scoreToBand(60)).toBe("high");
    expect(scoreToBand(38)).toBe("medium");
    expect(scoreToBand(20)).toBe("watch");
    expect(scoreToBand(10)).toBe("low");
  });
});

describe("project scoring reflects evidence, not the self-reported label", () => {
  it("flags Prime's burn running ahead of delivery as a budget factor", () => {
    const r = projectScores.get("p01")!;
    expect(r.factors.some((f) => f.kind === "budget")).toBe(true);
  });

  it("does not let an optimistic 'On Track' label suppress the risk", () => {
    const p01 = ds.projects.find((p) => p.id === "p01")!;
    expect(p01.statusRaw).toMatch(/on track/i); // PM said On Track...
    expect(projectScores.get("p01")!.band).not.toBe("low"); // ...the numbers disagree
  });

  it("is fully deterministic — same input yields the same score", () => {
    const p01 = ds.projects.find((p) => p.id === "p01")!;
    expect(scoreProject(p01, ds).score).toBe(scoreProject(p01, ds).score);
    expect(scoreProject(p01, ds).factors.length).toBe(scoreProject(p01, ds).factors.length);
  });
});

describe("client risk surfaces the less-obvious worse problem", () => {
  it("scores Helix (over budget + churn + renewal) above Prime (burning but with runway)", () => {
    const helix = clientScores.get("c02")!;
    const prime = clientScores.get("c01")!;
    expect(helix.score).toBeGreaterThan(prime.score);
    expect(["high", "medium"]).toContain(helix.band);
  });
});

describe("revenue engine separates recognition risk from cash/AR", () => {
  const rev = buildRevenue(ds, projectScores);

  it("totals committed and at-risk revenue exactly", () => {
    expect(rev.committedTotal).toBe(1_650_000);
    expect(rev.atRiskTotal).toBe(910_000);
  });

  it("flags the late-paying client as cash risk but keeps it OUT of the at-risk total", () => {
    const cash = rev.lines.find((l) => l.riskType === "cash")!;
    expect(cash.atRisk).toBe(true);
    expect(cash.projectName).toMatch(/Maple/);
    const recognitionRisk = rev.lines
      .filter((l) => l.atRisk && l.riskType !== "cash")
      .reduce((s, l) => s + l.committed, 0);
    expect(recognitionRisk).toBe(rev.atRiskTotal); // cash is excluded
  });
});

describe("capacity engine keeps unknown capacity unknowable", () => {
  const cap = buildCapacity(ds);

  it("finds the Design team over 100% with resource contention", () => {
    const design = cap.teams.find((t) => t.team === "Design")!;
    expect(design.utilization).toBeGreaterThan(1);
    expect(design.overAllocated.length).toBeGreaterThanOrEqual(3);
    expect(design.contendedProjects.length).toBeGreaterThanOrEqual(1);
  });

  it("never assumes a utilization for someone with no recorded capacity", () => {
    const unknown = cap.people.find((p) => p.capacity === null)!;
    expect(unknown.utilization).toBeNull();
  });
});

describe("data confidence summarises the mess honestly", () => {
  it("counts exactly one high-severity conflict and reads as moderate trust", () => {
    const dc = buildDataConfidence(ds);
    expect(dc.counts.high).toBe(1);
    expect(dc.level).toBe("moderate");
  });
});

describe("the briefing ranks correctly and frames totals vs at-risk", () => {
  const b = buildBriefing(ds);

  it("is sorted by score, highest first", () => {
    const scores = b.items.map((i) => i.score);
    expect([...scores].sort((a, z) => z - a)).toEqual(scores);
  });

  it("surfaces both a revenue and a capacity attention item", () => {
    expect(b.items.some((i) => i.kind === "revenue")).toBe(true);
    expect(b.items.some((i) => i.kind === "capacity")).toBe(true);
  });

  it("reports portfolio totals separately from the at-risk subset", () => {
    expect(b.stats.clients).toBe(12);
    expect(b.stats.projects).toBe(15);
    expect(b.stats.highRisk).toBeLessThan(b.stats.projects); // at-risk is a subset, never the total
  });
});

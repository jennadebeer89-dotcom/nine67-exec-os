/**
 * Normalization layer.
 *
 * Turns the deliberately-messy raw layer into clean typed entities — and, just as
 * importantly, records every inconsistency it encounters as a DataQualityIssue.
 * That issue list is what powers the Data Confidence panel: the system is honest
 * about what it had to guess, recover, or couldn't reconcile.
 *
 * Design principle: when sources conflict, we do NOT silently pick a winner. We
 * keep both, flag it, and reason from the prudent (worst) case downstream.
 */
import { DATA_AS_OF, THRESHOLDS } from "./config";
import type {
  RawAllocation,
  RawBudgetRecord,
  RawClient,
  RawEmployee,
  RawForecast,
  RawNote,
  RawProject,
} from "@/data/raw/types";
import type {
  Allocation,
  BudgetSource,
  Client,
  DataQualityIssue,
  Employee,
  Forecast,
  HealthFlag,
  Note,
  Project,
  ProjectStatus,
} from "./types";

// ---------------------------------------------------------------------------
// Primitive parsers — each tolerant of the documented mess.
// ---------------------------------------------------------------------------

/** "$1,200,000" | "120000" | "120k" | 95000 | "" -> number | null */
export function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().toLowerCase().replace(/[$,\s]/g, "");
  if (s === "") return null;
  const k = s.endsWith("k");
  const num = parseFloat(k ? s.slice(0, -1) : s);
  if (!Number.isFinite(num)) return null;
  return k ? num * 1000 : num;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DMY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Parse the documented date formats into ISO, or null if unparseable. */
export function parseDateISO(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  if (ISO_RE.test(s)) return s;
  const dmy = s.match(DMY_RE);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null; // "Q4", "Mar 3", etc. — deliberately not guessed
}

/** Whole-day difference toISO - fromISO (positive = toISO is later). */
function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00Z").getTime();
  const to = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((to - from) / 86_400_000);
}

/** "65" | "80%" | 0.45 | "" -> 0–100 | null */
export function parsePercent(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  let n: number;
  if (typeof v === "number") n = v;
  else {
    const s = String(v).trim().replace(/%/g, "");
    if (s === "") return null;
    n = parseFloat(s);
  }
  if (!Number.isFinite(n)) return null;
  if (n > 0 && n <= 1) n = n * 100; // decimal form (0.45)
  return Math.round(n);
}

function normalizeHealth(v: unknown): HealthFlag {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "") return "unknown";
  if (s.includes("green")) return "green";
  if (s.includes("red") || s.includes("at risk")) return "red";
  if (s.includes("amber") || s.includes("yellow")) return "amber";
  return "unknown";
}

function normalizeStatus(v: unknown): { status: ProjectStatus; ambiguous: boolean } {
  const raw = String(v ?? "").trim();
  const s = raw.toLowerCase();
  const ambiguous = raw.includes("?") || s === "";
  if (s === "") return { status: "unknown", ambiguous: true };
  if (s.includes("pause")) return { status: "paused", ambiguous };
  if (s.includes("complete") || s.includes("done")) return { status: "complete", ambiguous };
  if (s.includes("amber") || s.includes("risk")) return { status: "at_risk", ambiguous };
  if (s.includes("track") || s.includes("deliver") || s.includes("kickoff"))
    return { status: "on_track", ambiguous };
  return { status: "unknown", ambiguous: true };
}

function normalizeConfidence(v: unknown): Forecast["confidence"] {
  if (v === null || v === undefined || v === "") return "unknown";
  const s = String(v).trim().toLowerCase();
  const pct = parseFloat(s.replace(/%/g, ""));
  if (s.includes("%") && Number.isFinite(pct)) {
    if (pct >= 75) return "high";
    if (pct >= 50) return "medium";
    return "low";
  }
  if (s.includes("high")) return "high";
  if (s.includes("med")) return "medium";
  if (s.includes("low")) return "low";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Issue collector
// ---------------------------------------------------------------------------

class IssueCollector {
  private issues: DataQualityIssue[] = [];
  private n = 0;
  add(i: Omit<DataQualityIssue, "id">) {
    this.issues.push({ id: `dq${String(++this.n).padStart(2, "0")}`, ...i });
  }
  all() {
    return this.issues;
  }
}

// ---------------------------------------------------------------------------
// Entity normalizers
// ---------------------------------------------------------------------------

export interface NormalizeResult {
  clients: Client[];
  projects: Project[];
  employees: Employee[];
  allocations: Allocation[];
  notes: Note[];
  forecasts: Forecast[];
  issues: DataQualityIssue[];
}

export function normalize(
  input: {
    clients: RawClient[];
    projects: RawProject[];
    employees: RawEmployee[];
    allocations: RawAllocation[];
    notes: RawNote[];
    budgets: RawBudgetRecord[];
    forecasts: RawForecast[];
  },
  asOf: string = DATA_AS_OF,
): NormalizeResult {
  const issues = new IssueCollector();
  const daysSince = (dateISO: string | null) => (dateISO ? daysBetween(dateISO, asOf) : null);
  const daysUntil = (dateISO: string | null) => (dateISO ? daysBetween(asOf, dateISO) : null);

  // --- Clients ---
  const clients: Client[] = input.clients.map((c) => {
    const renewalDate = parseDateISO(c.renewal_date);
    const lastContact = parseDateISO(c.last_contact);
    const daysSinceContact = daysSince(lastContact);
    const health = normalizeHealth(c.health);
    const sentimentNote = c.sentiment_note?.trim() ? c.sentiment_note.trim() : null;

    // Ambiguous / missing renewal (e.g. "Q4" with no year, or absent entirely)
    if (renewalDate === null && c.renewal_date) {
      issues.add({
        kind: "ambiguous", severity: "medium", entityType: "client",
        entityId: c.id, entityName: c.name,
        title: "Renewal date is ambiguous",
        detail: `Renewal recorded as "${c.renewal_date}" — no parseable date. Can't time the renewal risk precisely.`,
      });
    } else if (renewalDate === null && !c.renewal_date) {
      issues.add({
        kind: "missing", severity: "medium", entityType: "client",
        entityId: c.id, entityName: c.name,
        title: "No renewal date on file",
        detail: "Renewal date is blank, so renewal-window risk can't be assessed for this account.",
      });
    }
    // Missing qualitative read while the account has gone quiet
    if (!sentimentNote && (daysSinceContact ?? 0) > THRESHOLDS.silentClientDays) {
      issues.add({
        kind: "missing", severity: "medium", entityType: "client",
        entityId: c.id, entityName: c.name,
        title: "No sentiment logged on a quiet account",
        detail: `No qualitative status recorded, and last contact was ${daysSinceContact} days ago. The account team has a blind spot here.`,
      });
    }
    if (health === "unknown" && c.health !== undefined && String(c.health).trim() === "") {
      issues.add({
        kind: "missing", severity: "low", entityType: "client",
        entityId: c.id, entityName: c.name,
        title: "Health status is blank",
        detail: "No RAG status recorded for this client.",
      });
    }

    return {
      id: c.id, name: c.name,
      industry: c.industry ?? null,
      accountManager: c.account_manager ?? null,
      segment: c.segment ?? null,
      contractValue: parseMoney(c.contract_value),
      renewalDate, renewalInDays: daysUntil(renewalDate),
      healthRaw: c.health != null ? String(c.health) : null,
      health, lastContact, daysSinceContact, sentimentNote,
    };
  });

  const clientById = new Map(clients.map((c) => [c.id, c]));

  // --- Budget records grouped by project (finance/SOW view) ---
  const budgetsByProject = new Map<string, RawBudgetRecord[]>();
  for (const b of input.budgets) {
    const arr = budgetsByProject.get(b.project_id) ?? [];
    arr.push(b);
    budgetsByProject.set(b.project_id, arr);
  }

  // --- Projects ---
  const projects: Project[] = input.projects.map((p) => {
    const { status, ambiguous } = normalizeStatus(p.status);
    const lastUpdate = parseDateISO(p.last_update);
    const daysSinceUpdate = daysSince(lastUpdate);
    const percentComplete = parsePercent(p.percent_complete);
    const clientName = p.client_id ? clientById.get(p.client_id)?.name ?? p.client_name ?? null : p.client_name ?? null;

    // Assemble all budget sources: the PM tool record + any finance/SOW records.
    const sources: BudgetSource[] = [];
    const pmBudget = parseMoney(p.budget);
    const pmSpent = parseMoney(p.spent);
    if (pmBudget !== null || pmSpent !== null) {
      sources.push({ source: "PM Tool", budget: pmBudget, spent: pmSpent, asOf: lastUpdate });
    }
    for (const b of budgetsByProject.get(p.id) ?? []) {
      sources.push({
        source: b.source,
        budget: parseMoney(b.budget),
        spent: parseMoney(b.spent),
        asOf: parseDateISO(b.as_of),
      });
    }

    // Reconcile BUDGET (contracted value).
    let budget = pmBudget;
    if (budget === null) {
      const recovered = sources.find((s) => s.budget !== null)?.budget ?? null;
      if (recovered !== null) {
        budget = recovered;
        issues.add({
          kind: "recovered", severity: "low", entityType: "project",
          entityId: p.id, entityName: p.name,
          title: "Budget missing from PM tool — recovered from finance",
          detail: `The project record had no budget; pulled $${recovered.toLocaleString()} from ${sources.find((s) => s.budget !== null)?.source}.`,
        });
      } else {
        issues.add({
          kind: "missing", severity: "medium", entityType: "project",
          entityId: p.id, entityName: p.name,
          title: "No budget on file",
          detail: "Budget is absent from every source, so margin/burn can't be computed for this project.",
        });
      }
    }

    // Reconcile SPEND, detecting conflicts across sources.
    const spentValues = sources.map((s) => s.spent).filter((x): x is number => x !== null);
    let spent: number | null = null;
    let spentWorstCase: number | null = null;
    let hasBudgetConflict = false;
    if (spentValues.length > 0) {
      const max = Math.max(...spentValues);
      const min = Math.min(...spentValues);
      const conflict = max > 0 && (max - min) / max > 0.05; // >5% disagreement
      if (conflict) {
        hasBudgetConflict = true;
        spent = null; // we genuinely don't know
        spentWorstCase = max;
        const detail = sources
          .filter((s) => s.spent !== null)
          .map((s) => `${s.source}: $${s.spent!.toLocaleString()}`)
          .join(" vs ");
        issues.add({
          kind: "conflict", severity: "high", entityType: "project",
          entityId: p.id, entityName: p.name,
          title: "Sources disagree on spend",
          detail: `${detail}. Using the worst case ($${max.toLocaleString()}) for risk until reconciled.`,
        });
      } else {
        // Sources agree within tolerance — take the prudent (highest) figure so
        // burn is never understated, consistent with the worst-case principle.
        spent = max;
        spentWorstCase = max;
      }
    }

    const denomSpend = spentWorstCase; // prudent
    const burnRatio = denomSpend !== null && budget ? denomSpend / budget : null;

    // Stale record
    if (daysSinceUpdate !== null && daysSinceUpdate > THRESHOLDS.staleDays && status !== "complete") {
      issues.add({
        kind: "stale", severity: daysSinceUpdate > 30 ? "medium" : "low",
        entityType: "project", entityId: p.id, entityName: p.name,
        title: `Not updated in ${daysSinceUpdate} days`,
        detail: `Last touched ${lastUpdate}. Status and completion may be out of date.`,
      });
    }
    // Ambiguous status
    if (ambiguous && p.status) {
      issues.add({
        kind: "ambiguous", severity: "low", entityType: "project",
        entityId: p.id, entityName: p.name,
        title: `Status "${p.status}" is unclear`,
        detail: "The recorded status isn't a clean state — treated cautiously by the risk engine.",
      });
    }
    // Missing completion
    if (percentComplete === null) {
      issues.add({
        kind: "missing", severity: "low", entityType: "project",
        entityId: p.id, entityName: p.name,
        title: "No completion % reported",
        detail: "Delivery progress is unreported, so burn-vs-delivery can't be checked for this project.",
      });
    }

    return {
      id: p.id, name: p.name,
      clientId: p.client_id ?? null, clientName,
      statusRaw: p.status != null ? String(p.status) : null,
      status, statusAmbiguous: ambiguous,
      lead: p.lead ?? null, team: p.team ?? null,
      start: parseDateISO(p.start), due: parseDateISO(p.due),
      dueInDays: daysUntil(parseDateISO(p.due)),
      budget, spent, spentWorstCase, burnRatio, percentComplete,
      lastUpdate, daysSinceUpdate,
      billingType: p.billing_type ?? null,
      notesInline: p.notes_inline?.trim() ? p.notes_inline.trim() : null,
      budgetSources: sources, hasBudgetConflict,
    };
  });

  const projectIds = new Set(projects.map((p) => p.id));

  // --- Employees ---
  const employees: Employee[] = input.employees.map((e) => {
    const cap = e.weekly_capacity_hours;
    const weeklyCapacity = cap === "" || cap === null || cap === undefined ? null : Number(cap);
    if (weeklyCapacity === null) {
      issues.add({
        kind: "missing", severity: "medium", entityType: "employee",
        entityId: e.id, entityName: e.name,
        title: "Capacity not recorded",
        detail: `No weekly capacity for ${e.name} (${e.role ?? "role unknown"}). They're booked on work, but utilization is unknowable.`,
      });
    }
    return {
      id: e.id, name: e.name, role: e.role ?? null, team: e.team ?? null,
      weeklyCapacity: weeklyCapacity !== null && Number.isFinite(weeklyCapacity) ? weeklyCapacity : null,
      employment: e.employment ?? null,
    };
  });

  // --- Allocations ---
  const allocations: Allocation[] = input.allocations.map((a) => ({
    employeeId: a.employee_id,
    projectId: a.project_id ?? null,
    hours: parseMoney(a.allocated_hours), // tolerant numeric parse
    role: a.role_on_project ?? null,
  }));

  // --- Notes (with orphan detection) ---
  const notes: Note[] = input.notes.map((nRaw) => {
    const about = nRaw.about ?? "";
    let entityType: Note["entityType"] = "unknown";
    let entityId = about;
    if (about.startsWith("team:")) {
      entityType = "team";
      entityId = about.slice(5);
    } else if (/^p\d+/.test(about)) {
      entityType = "project";
      if (!projectIds.has(about)) {
        issues.add({
          kind: "orphan", severity: "medium", entityType: "note",
          entityId: nRaw.id, entityName: `Note ${nRaw.id}`,
          title: `Note references unknown project "${about}"`,
          detail: `"${nRaw.text.slice(0, 80)}…" — no project with id ${about} exists. Orphaned signal.`,
        });
      }
    } else if (/^c\d+/.test(about)) {
      entityType = "client";
    }
    return {
      id: nRaw.id, entityType, entityId,
      author: nRaw.author ?? null, date: parseDateISO(nRaw.date),
      text: nRaw.text, channel: nRaw.channel ?? null,
    };
  });

  // --- Forecasts ---
  const forecasts: Forecast[] = input.forecasts.map((f) => ({
    projectId: f.project_id ?? null,
    clientId: f.client_id ?? null,
    quarter: f.quarter ?? null,
    committed: parseMoney(f.committed_revenue),
    recognized: parseMoney(f.recognized_to_date),
    confidenceRaw: f.confidence != null ? String(f.confidence) : null,
    confidence: normalizeConfidence(f.confidence),
    note: f.note?.trim() ? f.note.trim() : null,
  }));

  return {
    clients, projects, employees, allocations, notes, forecasts,
    issues: issues.all(),
  };
}

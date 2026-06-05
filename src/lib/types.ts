/**
 * Clean domain types — the normalized world the engine and UI reason about.
 * Produced from the messy raw layer by src/lib/normalize.ts.
 */

export type HealthFlag = "green" | "amber" | "red" | "unknown";
export type ProjectStatus =
  | "on_track"
  | "at_risk"
  | "paused"
  | "complete"
  | "unknown";
export type RiskBand = "high" | "medium" | "low" | "capacity" | "watch";

export interface BudgetSource {
  source: string;
  budget: number | null;
  spent: number | null;
  asOf: string | null;
}

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  accountManager: string | null;
  segment: string | null;
  contractValue: number | null;
  renewalDate: string | null; // ISO or null
  renewalInDays: number | null; // relative to DATA_AS_OF
  healthRaw: string | null;
  health: HealthFlag;
  lastContact: string | null;
  daysSinceContact: number | null;
  sentimentNote: string | null;
}

export interface Project {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  statusRaw: string | null;
  status: ProjectStatus;
  statusAmbiguous: boolean;
  lead: string | null;
  team: string | null;
  start: string | null;
  due: string | null;
  dueInDays: number | null;
  budget: number | null;
  spent: number | null;
  /** worst-case spend when sources conflict (used for prudent risk math) */
  spentWorstCase: number | null;
  burnRatio: number | null; // spent / budget (uses worst case if conflicting)
  percentComplete: number | null; // 0–100
  lastUpdate: string | null;
  daysSinceUpdate: number | null;
  billingType: string | null;
  notesInline: string | null;
  budgetSources: BudgetSource[]; // >1 means a conflict exists
  hasBudgetConflict: boolean;
}

export interface Employee {
  id: string;
  name: string;
  role: string | null;
  team: string | null;
  weeklyCapacity: number | null; // null when capacity is unrecorded
  employment: string | null;
}

export interface Allocation {
  employeeId: string;
  projectId: string | null;
  hours: number | null;
  role: string | null;
}

export interface Note {
  id: string;
  entityType: "project" | "client" | "team" | "unknown";
  entityId: string; // project/client id, team name, or raw "about" value
  author: string | null;
  date: string | null;
  text: string;
  channel: string | null;
}

export interface Forecast {
  projectId: string | null;
  clientId: string | null;
  quarter: string | null;
  committed: number | null;
  recognized: number | null;
  confidenceRaw: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
  note: string | null;
}

export type IssueKind =
  | "missing"
  | "conflict"
  | "stale"
  | "ambiguous"
  | "orphan"
  | "recovered";

export interface DataQualityIssue {
  id: string;
  kind: IssueKind;
  severity: "high" | "medium" | "low";
  entityType: "project" | "client" | "employee" | "note" | "forecast";
  entityId: string;
  entityName: string;
  title: string;
  detail: string;
}

export interface Dataset {
  clients: Client[];
  projects: Project[];
  employees: Employee[];
  allocations: Allocation[];
  notes: Note[];
  forecasts: Forecast[];
  issues: DataQualityIssue[];
  source: "supabase" | "local";
  asOf: string;
}

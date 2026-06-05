/**
 * RAW data types — deliberately permissive.
 *
 * This is what the business *actually* exports: a CRM dump, a PM-tool CSV, a
 * finance spreadsheet, a capacity Google Sheet, and a channel of Slack updates.
 * None of these systems agree on formats, completeness, or even the truth.
 *
 * The looseness here is intentional. The normalization layer (src/lib/normalize.ts)
 * is responsible for turning this mess into clean typed entities AND for recording
 * every inconsistency it finds, which powers the Data Confidence panel.
 *
 * Rules of the mess:
 *  - Money appears as "$120,000", "120000", "120k", or a number.
 *  - Dates appear as "2026-03-14", "14/03/2026", "Mar 3", "Q2", or are missing.
 *  - Statuses are free text: "Green", "amber", "At Risk", "on track?", "".
 *  - Fields go missing. Records occasionally reference things that don't exist.
 *  - Two systems sometimes report different numbers for the same project.
 */

export type Loose = string | number | null | undefined;

/** CRM export — one row per client account. */
export interface RawClient {
  id: string;
  name: string;
  industry?: string;
  account_manager?: string;
  segment?: string; // "Enterprise" | "Mid-Market" | "SMB" | messy variants
  contract_value?: Loose; // annual value, mixed formats
  renewal_date?: Loose; // mixed formats / missing
  health?: Loose; // free-text RAG-ish status
  last_contact?: Loose; // date of last logged touchpoint
  sentiment_note?: string; // qualitative read from the account team
  start_date?: Loose;
}

/** Project-tool export — one row per engagement. */
export interface RawProject {
  id: string;
  name: string;
  client_id?: string; // may not match a known client
  client_name?: string; // sometimes the only client reference present
  status?: Loose; // "On Track", "amber", "Delivering", "Paused?", ""
  lead?: string; // delivery lead name (not always an employee we track)
  team?: string; // primary team
  start?: Loose;
  due?: Loose; // target delivery
  budget?: Loose; // contracted budget (PM-tool view)
  spent?: Loose; // PM-tool's view of spend (may differ from finance)
  percent_complete?: Loose; // self-reported delivery %
  last_update?: Loose; // when the PM last touched the record
  billing_type?: string; // "Fixed Fee" | "T&M" | "Retainer"
  notes_inline?: string; // a stray free-text field PMs dump things into
}

/** Capacity sheet — one row per person. Maintained sporadically. */
export interface RawEmployee {
  id: string;
  name: string;
  role?: string;
  team?: string;
  weekly_capacity_hours?: Loose; // contracted capacity; sometimes blank
  employment?: string; // "FTE" | "Contractor" | "Part-time"
}

/** Allocation sheet — who is booked on what, per week. Frequently over 100%. */
export interface RawAllocation {
  employee_id: string;
  project_id?: string;
  allocated_hours?: Loose; // hours/week booked
  role_on_project?: string;
}

/** Status updates — copy-pasted from Slack / standups / status emails. */
export interface RawNote {
  id: string;
  about: string; // entity id: a project (p..) or client (c..) or team ("team:Design")
  author?: string;
  date?: Loose;
  text: string;
  channel?: string; // "Slack" | "Status Email" | "Standup" | "Client Call"
}

/** Finance budget tracker — the money team's separate spreadsheet. */
export interface RawBudgetRecord {
  project_id: string;
  source: string; // "Finance Tracker" | "PM Export" | "Client SOW"
  budget?: Loose;
  spent?: Loose;
  as_of?: Loose;
}

/** Revenue forecast sheet — quarterly commitments by project. */
export interface RawForecast {
  project_id?: string;
  client_id?: string;
  quarter?: string; // "Q2-2026" etc.
  committed_revenue?: Loose; // what we told leadership we'd book
  recognized_to_date?: Loose; // what's actually been recognized
  confidence?: Loose; // "High" | "Medium" | "Low" | a % | missing
  note?: string;
}

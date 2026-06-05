import type { RawClient } from "./types";

/**
 * CRM export — Meridian (digital product & growth agency).
 * As-of reference date for the whole dataset: 2026-06-05 (see src/lib/config.ts).
 *
 * Mess intentionally present:
 *  - contract_value in $string, plain number, and "k" shorthand
 *  - renewal_date in ISO, DD/MM/YYYY, quarter shorthand, and missing
 *  - health as free-text RAG with question marks and blanks
 *  - last_contact missing for some; deliberately stale for the "silent client"
 */
export const RAW_CLIENTS: RawClient[] = [
  {
    id: "c01",
    name: "Prime Retail Group",
    industry: "Retail / eCommerce",
    account_manager: "Dana Whitfield",
    segment: "Enterprise",
    contract_value: "$1,200,000",
    renewal_date: "2026-11-30",
    health: "Amber",
    last_contact: "2026-05-29",
    sentiment_note:
      "Sponsor raised concerns on the last call about replatform pace and budget burn. Wants a plan by mid-June.",
    start_date: "2023-02-01",
  },
  {
    id: "c02",
    name: "Helix Health",
    industry: "Healthcare",
    account_manager: "Marcus Bell",
    segment: "Enterprise",
    contract_value: "920000",
    renewal_date: "31/07/2026", // <60 days from as-of — renewal risk
    health: "At Risk",
    last_contact: "2026-05-22",
    sentiment_note:
      "Procurement is benchmarking two other vendors ahead of renewal. Champion left in April; new stakeholder is non-committal.",
    start_date: "2022-09-15",
  },
  {
    id: "c03",
    name: "Northwind Logistics",
    industry: "Logistics / Supply Chain",
    account_manager: "Dana Whitfield",
    segment: "Mid-Market",
    contract_value: "480k",
    renewal_date: "2027-01-15",
    health: "Green",
    last_contact: "2026-05-09", // ~27 days — silent client, hidden risk
    sentiment_note: "", // no qualitative read logged — missing signal
    start_date: "2024-06-01",
  },
  {
    id: "c04",
    name: "Atlas Financial",
    industry: "Financial Services",
    account_manager: "Priya Nair",
    segment: "Enterprise",
    contract_value: "$1,650,000",
    renewal_date: "2026-12-31",
    health: "Green",
    last_contact: "2026-06-02",
    sentiment_note:
      "Strong relationship. Flagship account. Eager for the mobile launch — board demo referenced for end of Q2.",
    start_date: "2021-11-01",
  },
  {
    id: "c05",
    name: "Brightwave Media",
    industry: "Media & Entertainment",
    account_manager: "Marcus Bell",
    segment: "Mid-Market",
    contract_value: "$320,000",
    renewal_date: "2026-10-01",
    health: "Green",
    last_contact: "2026-06-01",
    sentiment_note: "Happy. Brand refresh nearly delivered; likely reference client and upsell candidate.",
    start_date: "2025-01-20",
  },
  {
    id: "c06",
    name: "Vertex Manufacturing",
    industry: "Industrial / Manufacturing",
    account_manager: "Priya Nair",
    segment: "Enterprise",
    contract_value: "780000",
    renewal_date: "Q4", // ambiguous — quarter only, no year
    health: "amber?",
    last_contact: "2026-05-26",
    sentiment_note:
      "ERP rollout scope keeps growing without change orders. Client friendly but timeline expectations are unrealistic.",
    start_date: "2024-03-10",
  },
  {
    id: "c07",
    name: "Lumen Energy",
    industry: "Energy / Utilities",
    account_manager: "Dana Whitfield",
    segment: "Mid-Market",
    contract_value: "$540,000",
    renewal_date: "2027-03-01",
    health: "Green",
    last_contact: "2026-05-30",
    sentiment_note: "New account, kickoff went well. Still ramping; success criteria not fully documented yet.",
    start_date: "2026-04-15",
  },
  {
    id: "c08",
    name: "Harborline Bank",
    industry: "Financial Services",
    account_manager: "Marcus Bell",
    segment: "Enterprise",
    contract_value: "$1,100,000",
    renewal_date: "2026-09-15",
    health: "Green",
    last_contact: "2026-05-28",
    sentiment_note:
      "Relationship solid. Note: finance and delivery disagree on how much budget is left on the mobile banking build — needs reconciling.",
    start_date: "2023-07-01",
  },
  {
    id: "c09",
    name: "Sundial Hospitality",
    industry: "Hospitality / Travel",
    account_manager: "Priya Nair",
    segment: "Mid-Market",
    contract_value: "260000",
    // renewal_date missing entirely
    health: "", // blank
    last_contact: "2026-04-30", // ~5 weeks — also unclear project status
    sentiment_note: "Project may be paused — client went quiet after a budget review on their side. Unconfirmed.",
    start_date: "2025-05-01",
  },
  {
    id: "c10",
    name: "Greenfield Agritech",
    industry: "Agriculture / Tech",
    account_manager: "Marcus Bell",
    segment: "SMB",
    contract_value: "95k",
    renewal_date: "2026-08-20",
    health: "Green",
    last_contact: "2026-05-18",
    sentiment_note: "Small but steady. Low touch. Limited upside but reliable.",
    start_date: "2025-10-01",
  },
  {
    id: "c11",
    name: "Orbit Telecom",
    industry: "Telecommunications",
    account_manager: "Priya Nair",
    segment: "Enterprise",
    contract_value: "$1,420,000",
    renewal_date: "2026-12-01",
    health: "Green",
    last_contact: "2026-06-03",
    sentiment_note:
      "Two parallel builds running. Demanding but high value. Delivery quality is the relationship — any slip hurts.",
    start_date: "2022-04-01",
  },
  {
    id: "c12",
    name: "Maple & Co",
    industry: "Consumer Goods / CPG",
    account_manager: "Dana Whitfield",
    segment: "Mid-Market",
    contract_value: "$300,000",
    renewal_date: "2026-10-15",
    health: "Green",
    last_contact: "2026-05-20",
    sentiment_note:
      "Delivery is fine but they're 75 days late paying the last two invoices. Finance flagged; relationship team hasn't raised it yet.",
    start_date: "2024-12-01",
  },
];

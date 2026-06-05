import type { RawEmployee, RawAllocation } from "./types";

/**
 * Capacity sheet — maintained sporadically by resourcing.
 * Mess: two people have no capacity recorded (e19, e20), so any utilization
 * math for them is unknowable. The engine must flag that, not silently assume 40h.
 */
export const RAW_EMPLOYEES: RawEmployee[] = [
  { id: "e01", name: "Aisha Rahman", role: "Engineering Lead", team: "Engineering", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e02", name: "Tom Okafor", role: "Engineering Lead", team: "Engineering", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e03", name: "Sofia Crane", role: "Engineering Lead", team: "Engineering", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e04", name: "Liam Novak", role: "Senior Engineer", team: "Engineering", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e05", name: "Chen Wei", role: "Engineer", team: "Engineering", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e06", name: "Omar Haddad", role: "Engineer", team: "Engineering", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e07", name: "Grace Lin", role: "Engineer", team: "Engineering", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e08", name: "Ben Carter", role: "Engineer", team: "Engineering", weekly_capacity_hours: 40, employment: "Contractor" },
  { id: "e09", name: "Elena Costa", role: "Design Lead", team: "Design", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e10", name: "Maya Singh", role: "Senior Designer", team: "Design", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e11", name: "Noah Reed", role: "Designer", team: "Design", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e12", name: "Isla Murphy", role: "Designer", team: "Design", weekly_capacity_hours: 20, employment: "Part-time" },
  { id: "e13", name: "Raj Patel", role: "Data Lead", team: "Data", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e14", name: "Hannah Bauer", role: "Data Engineer", team: "Data", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e15", name: "Yuki Tanaka", role: "Data Analyst", team: "Data", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e16", name: "Dana Whitfield", role: "Account Director", team: "Client Services", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e17", name: "Marcus Bell", role: "Account Manager", team: "Client Services", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e18", name: "Priya Nair", role: "Account Director", team: "Client Services", weekly_capacity_hours: 40, employment: "FTE" },
  { id: "e19", name: "Sam Ellis", role: "Engineer", team: "Engineering", weekly_capacity_hours: "", employment: "Contractor" }, // capacity missing
  { id: "e20", name: "Farah Aziz", role: "Designer", team: "Design", weekly_capacity_hours: undefined, employment: "FTE" }, // capacity missing
];

/**
 * Allocation sheet — hours booked per person per week.
 * Mess: the Design pod is over-booked. Elena, Maya, and Isla all exceed capacity,
 * and three Design projects (Orbit x2 + Brightwave) compete for the same few people.
 * Two engineers without recorded capacity (Sam, Farah) are still booked — unknowable load.
 */
export const RAW_ALLOCATIONS: RawAllocation[] = [
  // --- Engineering ---
  { employee_id: "e01", project_id: "p01", allocated_hours: 20, role_on_project: "Lead" },
  { employee_id: "e01", project_id: "p02", allocated_hours: 8, role_on_project: "Lead" },
  { employee_id: "e01", project_id: "p10", allocated_hours: 16, role_on_project: "Lead" }, // Aisha at ~110%
  { employee_id: "e02", project_id: "p03", allocated_hours: 18, role_on_project: "Lead" },
  { employee_id: "e02", project_id: "p04", allocated_hours: 10, role_on_project: "Lead" },
  { employee_id: "e02", project_id: "p08", allocated_hours: 14, role_on_project: "Lead" }, // Tom at ~105%
  { employee_id: "e03", project_id: "p05", allocated_hours: 24, role_on_project: "Lead" },
  { employee_id: "e03", project_id: "p09", allocated_hours: 10, role_on_project: "Lead" },
  { employee_id: "e04", project_id: "p01", allocated_hours: 24, role_on_project: "Senior Eng" },
  { employee_id: "e04", project_id: "p05", allocated_hours: 16, role_on_project: "Senior Eng" }, // Liam at 100%
  { employee_id: "e05", project_id: "p01", allocated_hours: 30, role_on_project: "Engineer" },
  { employee_id: "e06", project_id: "p03", allocated_hours: 20, role_on_project: "Engineer" },
  { employee_id: "e06", project_id: "p08", allocated_hours: 16, role_on_project: "Engineer" },
  { employee_id: "e07", project_id: "p05", allocated_hours: 28, role_on_project: "Engineer" },
  { employee_id: "e08", project_id: "p10", allocated_hours: 32, role_on_project: "Engineer" },
  { employee_id: "e19", project_id: "p10", allocated_hours: 20, role_on_project: "Engineer" }, // capacity unknown
  // --- Design (the over-stretched pod) ---
  { employee_id: "e09", project_id: "p07", allocated_hours: 12, role_on_project: "Design Lead" },
  { employee_id: "e09", project_id: "p11", allocated_hours: 4, role_on_project: "Design Lead" },
  { employee_id: "e09", project_id: "p12", allocated_hours: 16, role_on_project: "Design Lead" },
  { employee_id: "e09", project_id: "p13", allocated_hours: 16, role_on_project: "Design Lead" }, // Elena ~120%
  { employee_id: "e10", project_id: "p12", allocated_hours: 18, role_on_project: "Senior Designer" },
  { employee_id: "e10", project_id: "p13", allocated_hours: 16, role_on_project: "Senior Designer" },
  { employee_id: "e10", project_id: "p07", allocated_hours: 10, role_on_project: "Senior Designer" }, // Maya ~110%
  { employee_id: "e11", project_id: "p12", allocated_hours: 20, role_on_project: "Designer" },
  { employee_id: "e11", project_id: "p13", allocated_hours: 20, role_on_project: "Designer" }, // Noah 100%
  { employee_id: "e12", project_id: "p11", allocated_hours: 8, role_on_project: "Designer" },
  { employee_id: "e12", project_id: "p12", allocated_hours: 16, role_on_project: "Designer" }, // Isla ~120% of 20h
  { employee_id: "e20", project_id: "p13", allocated_hours: 18, role_on_project: "Designer" }, // capacity unknown
  // --- Data ---
  { employee_id: "e13", project_id: "p06", allocated_hours: 16, role_on_project: "Data Lead" },
  { employee_id: "e13", project_id: "p15", allocated_hours: 14, role_on_project: "Data Lead" },
  { employee_id: "e13", project_id: "p14", allocated_hours: 6, role_on_project: "Data Lead" },
  { employee_id: "e14", project_id: "p06", allocated_hours: 28, role_on_project: "Data Engineer" },
  { employee_id: "e15", project_id: "p15", allocated_hours: 24, role_on_project: "Data Analyst" },
  { employee_id: "e15", project_id: "p06", allocated_hours: 10, role_on_project: "Data Analyst" },
  // Note: p09 (Lumen) is under-staffed relative to its timeline — only the lead is booked.
];

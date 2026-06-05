import type { Dataset } from "../types";
import type { CapacityReport, PersonLoad, TeamLoad } from "./types";

/**
 * Capacity engine. Pure arithmetic over allocations and recorded capacity.
 * People with no recorded capacity are kept separate (utilization = null) rather
 * than assumed — their load is genuinely unknowable and the UI says so.
 */
export function buildCapacity(ds: Dataset): CapacityReport {
  const projectName = new Map(ds.projects.map((p) => [p.id, p.name]));

  const people: PersonLoad[] = ds.employees.map((e) => {
    const allocs = ds.allocations.filter((a) => a.employeeId === e.id);
    const allocatedHours = allocs.reduce((s, a) => s + (a.hours ?? 0), 0);
    const capacity = e.weeklyCapacity;
    const utilization = capacity && capacity > 0 ? allocatedHours / capacity : null;
    return {
      id: e.id,
      name: e.name,
      role: e.role,
      team: e.team,
      allocatedHours,
      capacity,
      utilization,
      projects: allocs.map((a) => a.projectId).filter((x): x is string => !!x),
    };
  });

  const teamNames = Array.from(new Set(people.map((p) => p.team ?? "Unassigned")));
  const teams: TeamLoad[] = teamNames.map((team) => {
    const members = people.filter((p) => (p.team ?? "Unassigned") === team);
    const working = members.filter((m) => m.allocatedHours > 0);
    const knownCapacity = members.reduce((s, m) => s + (m.capacity ?? 0), 0);
    const allocatedKnown = members
      .filter((m) => m.capacity && m.capacity > 0)
      .reduce((s, m) => s + m.allocatedHours, 0);
    const utilization = knownCapacity > 0 ? allocatedKnown / knownCapacity : null;
    const overAllocated = members.filter((m) => m.utilization !== null && m.utilization > 1);
    const unknownCapacity = working.filter((m) => m.capacity === null);

    // Resource contention: projects that draw on 2+ people who are over-allocated.
    const contention = new Map<string, number>();
    for (const m of overAllocated) {
      for (const pid of new Set(m.projects)) {
        contention.set(pid, (contention.get(pid) ?? 0) + 1);
      }
    }
    const contendedProjects = Array.from(contention.entries())
      .filter(([, count]) => count >= 2)
      .map(([projectId, people]) => ({ projectId, name: projectName.get(projectId) ?? projectId, people }))
      .sort((a, b) => b.people - a.people);

    return {
      team,
      allocatedHours: members.reduce((s, m) => s + m.allocatedHours, 0),
      knownCapacity,
      utilization,
      overAllocated: overAllocated.sort((a, b) => (b.utilization ?? 0) - (a.utilization ?? 0)),
      unknownCapacity,
      contendedProjects,
      people: members.sort((a, b) => (b.utilization ?? -1) - (a.utilization ?? -1)),
    };
  });

  return { teams: teams.sort((a, b) => (b.utilization ?? 0) - (a.utilization ?? 0)), people };
}

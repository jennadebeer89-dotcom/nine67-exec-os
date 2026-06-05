import type { RawNote } from "./types";

/**
 * Status updates — pasted from Slack, standups, status emails, and client calls.
 * This is the qualitative layer: the signal that never makes it into a budget cell.
 *
 * Mess intentionally present:
 *  - conflicting reads on the same project days apart
 *  - one note references a project that doesn't exist (p99) — orphaned
 *  - vague sentiment, hedged language, and stale enthusiasm
 *  - dates relative to the dataset as-of of 2026-06-05
 */
export const RAW_NOTES: RawNote[] = [
  // Prime Retail — Commerce Replatform (p01): the budget/delivery gap, with conflicting reads
  { id: "n01", about: "p01", author: "Aisha Rahman", date: "2026-06-01", channel: "Standup", text: "Checkout refactor taking longer than scoped. We're at ~65% but burning fast. Need to talk margin." },
  { id: "n02", about: "p01", author: "Dana Whitfield", date: "2026-05-29", channel: "Client Call", text: "Prime sponsor asked directly why May velocity dropped and whether we'll hit July. They want a recovery plan by mid-June." },
  { id: "n03", about: "p01", author: "Aisha Rahman", date: "2026-05-20", channel: "Status Email", text: "Still green on timeline. Team is heads-down." }, // earlier, rosier — conflicts with n01/n02
  { id: "n04", about: "c01", author: "Dana Whitfield", date: "2026-05-29", channel: "Client Call", text: "Relationship is fine but the replatform is the whole relationship right now. If it slips, renewal in November gets harder." },

  // Helix Health — Patient Portal (p03) + renewal risk (c02)
  { id: "n05", about: "p03", author: "Tom Okafor", date: "2026-06-02", channel: "Standup", text: "Compliance review added scope. We're over budget now. 80% done but the last 20% is the hard 20%." },
  { id: "n06", about: "c02", author: "Marcus Bell", date: "2026-05-22", channel: "Status Email", text: "Helix renewal end of July. Their old champion left; the new stakeholder is 'evaluating options.' Procurement is talking to two competitors." },
  { id: "n07", about: "c02", author: "Marcus Bell", date: "2026-05-12", channel: "Slack", text: "Gut feel: Helix is a coin flip. We need a delivery win before renewal or we lose it." },

  // Northwind (c03 / p04): the silent client
  { id: "n08", about: "p04", author: "Tom Okafor", date: "2026-05-07", channel: "Standup", text: "TMS integration ticking along. No blockers. Haven't heard from client side in a bit." },
  { id: "n09", about: "c03", author: "Dana Whitfield", date: "2026-05-09", channel: "Slack", text: "Northwind's gone quiet. Last real conversation was early May. Probably fine but I haven't confirmed." },

  // Atlas — Mobile (p05): revenue slipping out of quarter
  { id: "n10", about: "p05", author: "Sofia Crane", date: "2026-06-03", channel: "Standup", text: "Auth rework + App Store review mean the end-of-Q2 launch likely slips to mid-July. Functionally on track, just not by the date finance has." },
  { id: "n11", about: "p05", author: "Priya Nair", date: "2026-06-02", channel: "Client Call", text: "Atlas board demo is the deadline that matters to them. A July slip is survivable if we tell them now, ugly if we surprise them." },
  { id: "n12", about: "c04", author: "Priya Nair", date: "2026-06-02", channel: "Client Call", text: "Atlas is our happiest big account. Don't let the mobile slip become a trust problem." },

  // Vertex — ERP (p08): scope creep, margin erosion
  { id: "n13", about: "p08", author: "Tom Okafor", date: "2026-05-30", channel: "Status Email", text: "Vertex added requirements again. Third time, still no change order. We're absorbing it and the margin shows it." },
  { id: "n14", about: "c06", author: "Priya Nair", date: "2026-05-26", channel: "Slack", text: "Vertex are lovely to work with but their timeline expectations are fantasy. Someone has to have the hard conversation." },

  // Harborline (p10): the budget conflict
  { id: "n15", about: "p10", author: "Aisha Rahman", date: "2026-05-27", channel: "Slack", text: "PM tool says we've spent ~540k. Finance says 720k. Big gap. I don't trust our number until someone reconciles." },
  { id: "n16", about: "c08", author: "Marcus Bell", date: "2026-05-28", channel: "Status Email", text: "Harborline relationship is solid. The only risk is us not knowing our own numbers on the mobile build." },

  // Sundial (p11): ambiguous / possibly paused
  { id: "n17", about: "p11", author: "Elena Costa", date: "2026-04-28", channel: "Slack", text: "Sundial went dark after their internal budget review. Nobody's told us to stop but nobody's responding either." },
  { id: "n18", about: "c09", author: "Priya Nair", date: "2026-04-30", channel: "Status Email", text: "Treating Sundial as paused for planning, but it's officially still 'active.' We should confirm before we forecast it." },

  // Orbit (p12/p13) + Design capacity
  { id: "n19", about: "p12", author: "Elena Costa", date: "2026-06-02", channel: "Standup", text: "Orbit dashboard is fine on quality but the design pod is stretched thin across this, the portal, and Brightwave." },
  { id: "n20", about: "team:Design", author: "Elena Costa", date: "2026-06-02", channel: "Slack", text: "Realistically the design team is over 100% for the next 6 weeks. Something has to give or quality will." },
  { id: "n21", about: "p13", author: "Maya Singh", date: "2026-06-01", channel: "Standup", text: "Self-service portal moving, but I'm split across three projects. Context-switching is killing throughput." },

  // Brightwave (p07): healthy reference client
  { id: "n22", about: "p07", author: "Elena Costa", date: "2026-06-01", channel: "Status Email", text: "Brand refresh basically done. Client is thrilled — good reference and likely upsell." },

  // Maple (p15 / c12): delivery fine, payment problem
  { id: "n23", about: "c12", author: "Dana Whitfield", date: "2026-05-20", channel: "Slack", text: "Maple delivery is fine but they're 75 days late on two invoices. Finance flagged it; I haven't raised it with the client yet." },
  { id: "n24", about: "p15", author: "Raj Patel", date: "2026-05-29", channel: "Standup", text: "Migration at 70%, on plan. No delivery concerns here." },

  // Lumen (p09): new, under-scoped data
  { id: "n25", about: "p09", author: "Sofia Crane", date: "2026-05-31", channel: "Standup", text: "Lumen portal kicked off. Budget still isn't in the tracker and we're light on staffing for the timeline." },
  { id: "n26", about: "c07", author: "Dana Whitfield", date: "2026-05-30", channel: "Client Call", text: "Lumen is positive but success criteria aren't documented. Scope ambiguity risk if we don't pin it down." },

  // Atlas Data (p06): genuinely healthy
  { id: "n27", about: "p06", author: "Raj Patel", date: "2026-05-31", channel: "Status Email", text: "Data platform tracking to plan. Nothing to report, which is the good kind of update." },

  // Greenfield (p14): low touch
  { id: "n28", about: "p14", author: "Raj Patel", date: "2026-05-23", channel: "Standup", text: "Greenfield app steady at 60%. Small team, low risk." },

  // Northwind delivery detail
  { id: "n29", about: "p04", author: "Omar Haddad", date: "2026-05-05", channel: "Slack", text: "Waiting on Northwind's API credentials to finish the integration. Asked twice, no response yet." },

  // Prime loyalty (p02): stale / blocked
  { id: "n30", about: "p02", author: "Aisha Rahman", date: "2026-05-08", channel: "Slack", text: "Loyalty phase 2 blocked on client brand assets. Parked until they deliver. No movement." },

  // Cross-cutting leadership-ish notes
  { id: "n31", about: "team:Engineering", author: "Aisha Rahman", date: "2026-05-30", channel: "Slack", text: "Eng leads are all over-allocated — me, Tom, and Sofia are each running 2-3 builds. Single points of failure everywhere." },
  { id: "n32", about: "c04", author: "Priya Nair", date: "2026-05-15", channel: "Status Email", text: "Atlas hinted at a Phase 2 mobile expansion if the launch lands well. Big upside — protect it." },
  { id: "n33", about: "p05", author: "Sofia Crane", date: "2026-05-18", channel: "Standup", text: "Mobile app on track for end of Q2." }, // earlier optimism — conflicts with n10
  { id: "n34", about: "p08", author: "Priya Nair", date: "2026-05-10", channel: "Slack", text: "Should we even keep taking Vertex scope without paper? This is becoming a loss-leader." },
  { id: "n35", about: "p99", author: "Unknown", date: "2026-05-04", channel: "Slack", text: "Quick note on the Halo migration — looks fine." }, // ORPHAN: p99 doesn't exist
  { id: "n36", about: "c02", author: "Tom Okafor", date: "2026-06-02", channel: "Slack", text: "If we can ship the Helix portal clean before renewal it changes the whole conversation." },
  { id: "n37", about: "c01", author: "Aisha Rahman", date: "2026-05-31", channel: "Slack", text: "Prime is watchable, not yet a crisis. But the budget math is unforgiving if we don't change pace." },
  { id: "n38", about: "p11", author: "Elena Costa", date: "2026-03-15", channel: "Status Email", text: "Sundial going well, client engaged." }, // very stale rosy note — contradicts current silence
  { id: "n39", about: "team:Design", author: "Maya Singh", date: "2026-05-28", channel: "Slack", text: "If Orbit pulls in either deadline we cannot also keep Brightwave quality. Need a call on priorities." },
  { id: "n40", about: "c12", author: "Marcus Bell", date: "2026-05-21", channel: "Slack", text: "Reminder: Maple's late payments are a relationship risk, not just a finance one. Don't let it fester." },
  { id: "n41", about: "p03", author: "Tom Okafor", date: "2026-05-12", channel: "Slack", text: "Helix at 78%, compliance review pending." }, // mild conflict with later 80%
  { id: "n42", about: "p10", author: "Ben Carter", date: "2026-05-25", channel: "Standup", text: "Harborline build is solid technically. The only chaos is the budget reporting." },
  { id: "n43", about: "c11", author: "Priya Nair", date: "2026-06-03", channel: "Client Call", text: "Orbit happy so far. They've made clear: a missed date on either build damages trust fast." },
  { id: "n44", about: "p01", author: "Chen Wei", date: "2026-05-26", channel: "Slack", text: "Honestly we under-scoped checkout. The 65% number flatters us — the remaining work is gnarly." },
  { id: "n45", about: "c09", author: "Elena Costa", date: "2026-05-30", channel: "Slack", text: "Still nothing from Sundial. I'd write down the forecast for them until we hear otherwise." },
  { id: "n46", about: "p05", author: "Priya Nair", date: "2026-06-04", channel: "Slack", text: "Decision needed this week: do we proactively tell Atlas about the July slip, or hold? I'd tell them." },
  { id: "n47", about: "team:Engineering", author: "Sofia Crane", date: "2026-05-29", channel: "Slack", text: "Lumen needs more hands. Right now it's basically me. That won't scale to the timeline." },
  { id: "n48", about: "c06", author: "Priya Nair", date: "2026-06-01", channel: "Slack", text: "Need to put a change order in front of Vertex before we do another sprint of free scope." },
  { id: "n49", about: "p07", author: "Maya Singh", date: "2026-05-30", channel: "Standup", text: "Brightwave final revisions in. Could close this out next week and free up design capacity." },
  { id: "n50", about: "c04", author: "Priya Nair", date: "2026-05-28", channel: "Status Email", text: "Atlas is the account I'd least want to wobble. Everything else is replaceable revenue; this one compounds." },
];

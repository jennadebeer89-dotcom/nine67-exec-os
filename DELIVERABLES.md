# Deliverables, assumptions & thinking

> **Live demo:** [nine67-exec-os.vercel.app](https://nine67-exec-os.vercel.app) — click through directly, no login. Live GPT-4o + Supabase Postgres.
> **Run locally:** `pnpm install && pnpm dev` (runs with zero config; see README). **Inspect the engine:** `pnpm engine:check`.

## The business problem

Leadership teams usually have *more* operational data than they can use, and *less* visibility into what
actually requires action. The information is fragmented — spread across project-management tools,
spreadsheets, finance systems, client updates, and team conversations. As an agency grows, executives
spend a rising share of their time just *gathering and reconciling* that information before they can make
a decision.

So the problem this solves is **not reporting — it's decision-making.** The goal is to transform
fragmented, inconsistent operational data into a small set of clear priorities, explain *why* each one
matters, surface the evidence behind it, and recommend an action leadership can take immediately — while
being honest about where the underlying data can't be fully trusted.

**The outcome is not better reporting. The outcome is faster, higher-quality leadership decisions.**

---

## What this is

An AI-powered **Executive Operating System** for a growing agency. The brief asked for something
leadership can click through and immediately understand — *what needs attention, which clients are at
risk, where we're stretched, what revenue is exposed, and what to focus on this week.*

The deliberate product decision was: **don't build a dashboard, build a decision-support system.** Most
attempts at this become a wall of charts. This one opens with the answer — a ranked list of what needs
attention, each item explaining *why*, showing its *evidence*, and recommending a *next action*. Charts
exist, but as supporting evidence inside the drill-downs, not as the main event.

The **briefing is the interface; the decision-support system is the product.** What leadership sees is a
calm, 60-second read — but underneath it is a deterministic engine doing the reconciliation, scoring, and
prioritisation a human would otherwise do by hand across five tools.

---

## The thesis: make AI *trustworthy* to a skeptical executive

An executive won't act on "the AI says this client is at risk." They'll act on *"this client is at
risk because the portal is 12% over budget, the renewal is 56 days out, the champion left in April,
and procurement is benchmarking two competitors — here's the actual note."*

So the system is split into **three layers**, and the boundary between them is the whole design:

- **A deterministic engine** computes every number — risk scores, capacity utilization, revenue-at-risk,
  data-quality flags. Pure TypeScript, inspectable (`pnpm engine:check`), **unit-tested** (`pnpm test` —
  scores, factors, the messy-data parsers, conflict worst-case, revenue-at-risk), identical every run. Each risk
  score is a sum of weighted **factors**, and each factor carries its own **evidence** (the metric, the
  budget source, or the literal status note behind it). Numbers are never left to a model.
- **An AI judgment layer** does the thing a dashboard fundamentally cannot: it *reads the unstructured
  field notes* — calls, standups, status emails — and reasons about what the numbers **don't** show.
  Relationship and political risk (a champion left, procurement is shopping), contradictions between
  reported status and what people are actually saying, team morale, hidden dependencies. This is the
  **"AI Insights — what the numbers don't show"** panel and the per-item **field read**. It's explicitly
  advisory and labelled as such, sitting *alongside* the hard numbers, not replacing them.
- **An AI generation layer** turns a recommendation into a usable artifact — the executive summary, the
  plain-English "why," and **drafted outreach** (the actual email to a client sponsor or Slack message to
  a delivery team, ready to send).

That's the AI-native methodology in one line: **deterministic facts → AI judgment over the human signal →
AI-generated action.** The AI does reasoning and creation, not just captioning — but never the arithmetic,
so it stays trustworthy. Everything is grounded in the snapshot; the AI is instructed never to invent
figures, and the whole product still runs on deterministic fallbacks if the model key is removed.

The result: the AI can be wrong about *tone* but not about *facts*, because the facts come from the
engine. That's what makes it safe to put in front of leadership.

---

## How we handled the mess (this was the point)

The sample data is modeled as if it came from five systems that don't agree: a CRM export, a PM tool,
a finance tracker, a capacity sheet, and pasted Slack/status updates. The mess is specific and
intentional, and the system **surfaces it rather than hiding it**:

| The mess | How the system handles it |
| --- | --- |
| **Conflicting spend** — finance says Harborline burned $720k, the PM tool says $540k | Keeps **both**, flags a high-severity conflict, and reasons from the **worst case** instead of silently picking one. The drill-down shows spend by source. |
| **Stale records** — Sundial untouched 38 days, statuses possibly out of date | Flagged as stale; staleness lowers confidence and contributes to risk. |
| **Missing data** — two people have no capacity recorded; a project has no budget | Capacity is left *unknowable* (not assumed) and shown with a hatched bar; the missing budget was **recovered from finance** and that recovery is logged. |
| **Ambiguous status** — "Paused?", "amber?", a renewal listed as just "Q4" | Parsed cautiously, flagged as unclear, and the renewal-window math is skipped rather than guessed. |
| **Conflicting signals** — a PM marks Prime "On Track" while the budget says 92% spent at 65% done | The engine trusts the **numbers over the label**, and the note ("client asking why velocity dipped") becomes evidence. |
| **Orphaned records** — a status note references a project that doesn't exist | Detected and surfaced as an orphaned signal. |

All of this rolls up into the **Data Confidence** panel and a 0–100 score, with a one-line honest
summary ("this briefing is built on imperfect data — 1 conflicting figure, 3 stale records…"). Telling
leadership where you're *unsure* is the most consultant-like thing the tool does.

---

## Assumptions we made

- **A fixed "as-of" date (2026-06-05).** The dataset is a snapshot, so all "days since / renewal in N
  days / this quarter" math anchors to a fixed date in `src/lib/config.ts` rather than the wall clock.
  Otherwise every record would read as "stale" a month from now and the demo would drift.
- **Risk thresholds are judgment calls**, centralized and explainable in `config.ts` (e.g. stale at 21
  days, renewal "urgent" at 60 days, budget warning at 85% burn). A real deployment would tune these
  with leadership and likely per-client.
- **"Revenue at risk" = recognition risk**, deliberately separated from **cash/AR risk** (a client
  paying late is flagged, but kept out of the revenue-at-risk total — it's a different problem).
- **Sample data, single-tenant, no auth.** It's a demo of the *thinking*, not a production multi-tenant
  system.
- **AI is additive, never load-bearing.** Pull the API key and the whole product still works on
  deterministic fallbacks — including the chat answering the benchmark questions correctly.

---

## What gave us pause

- **How "at risk" should the quarter feel?** An early pass flagged ~78% of committed revenue as at
  risk, which reads as alarmist and erodes trust. We tightened the definition to genuinely exposed
  lines (~55%, $910k of $1.6M) and made each line state its specific reason. Calibration *is* the
  product here — over-flagging is as damaging as under-flagging.
- **When two systems disagree, what number do you show?** Showing one and hiding the other is how
  dashboards lie. We chose to show both, flag the conflict, and act on the prudent case — but that
  means accepting "we don't actually know" as a first-class state, which dashboards rarely do.
- **The honest-data tension.** Helix (already over budget + churn signals) scores higher than Prime
  (burning fast but with runway). That contradicts a first-glance "Prime is the fire" read — but it's
  what the data says, and the engine surfacing the *less obvious* worse problem is exactly the value.
- **Latency vs. freshness of AI.** Live summaries/explanations are cached per snapshot so the page is
  fast and cheap; a live operation would need a smarter invalidation strategy.

---

## Deliberate AI-design choices (and what they signal)

- **Why the AI isn't agentic — yet.** Every AI call here is a single, *grounded* completion over a frozen
  snapshot, not an autonomous agent loop. That's a deliberate trust decision: an executive won't act on a
  system whose reasoning changes between runs, and a tool-using agent is only as safe as its weakest live
  data pull. So the **facts stay deterministic and reproducible** and the AI does judgment and writing on
  top of them. The agent layer is the natural next step *once the ground truth is trustworthy* — a triage
  agent that watches the alert stream and opens the change-order task, a retention agent that drafts and
  schedules renewal outreach, a reconciliation agent that chases the finance-vs-PM spend conflict to
  ground. The architecture is already shaped for it: the engine's output **is** the tool surface an agent
  would act on.
- **Why sample data isn't a shortcut.** The data is modeled as five disagreeing exports (CRM, PM tool,
  finance tracker, capacity sheet, status notes) and flows through one `normalize()` layer. *That layer —
  not the UI — is the integration point.* Swapping the in-repo modules for real connectors
  (HubSpot/Salesforce, Jira/Asana, Xero/QuickBooks, Harvest/Float) feeds the **same** pipeline, so the
  mess-handling and Data Confidence story hold unchanged against live systems. The Supabase path already
  proves it: the identical messy rows stored as `text` produce the identical briefing. Single-tenant, no
  auth — a demo of the thinking, not a production multi-tenant system.

---

## Trend detection & alerts (added in a second pass)

Two of the brief's "smarter than a dashboard" examples — **trend detection** and **automated alerts** —
were built out after the initial version:

- **Trend detection** (`src/data/history.ts` + `src/lib/engine/trends.ts`). Rather than fabricate
  "trend" text, we reconstruct where a handful of real values stood a week ago and run the **same engine**
  over that prior snapshot. The deltas are genuinely computed: "Prime's burn went 78%→92%," "revenue at
  risk rose $490k→$910k," "Northwind crossed the 21-day silent line," "Design utilization 103%→111%."
  Surfaced as a "What changed this week" panel and per-item trend chips. Several trends emerge purely from
  the date shift (renewals tick closer, a client tips into "silent") — exactly as they would in reality.
- **Automated alerts** (`src/lib/engine/alerts.ts`). Threshold rules across budget, client, capacity,
  revenue, data quality, and week-over-week movement. Each alert names the rule that fired and deep-links
  to the underlying item. Surfaced on `/alerts`, a nav bell with a count, and a homepage banner. Alerts
  can be acknowledged to clear them from the count — they persist locally and resurface until the
  underlying condition is genuinely resolved (acknowledged ≠ fixed).
- **Weekly briefing email** (`/digest`). The auto-generated executive briefing email to leadership — AI headline,
  the week in a paragraph, top 3 actions with owners, and a "watch" line on data trust. A real artifact,
  not a mockup; generated on demand from the same engine + AI layer.

## Measuring success

Because the product is decision-making, not reporting, success is measured by whether leadership *acts
earlier and better* — and what that protects financially. This framing is surfaced in the product
itself, on the **Impact** page (`/impact`): what problem we're solving, what matters most to leadership,
and how we measure the return — quantitatively and qualitatively — with every figure derived live from
the engine.

**Quantitative**
- Reduction in time leadership spends gathering and reconciling operational information before a decision.
- Earlier identification of at-risk projects and clients (lead time between a risk emerging and being acted on).
- Reduction in revenue at risk per quarter, and improved client retention / renewal rates.
- Improved resource utilisation and fewer over-capacity periods.
- Reduction in project overruns and budget leakage.

**Qualitative**
- Increased leadership confidence in operational decisions.
- Tighter alignment between delivery, finance, and client teams (one shared view of the truth).
- Faster response to emerging risks.
- Better visibility across the business without more meetings or status chasing.

**ROI framework.** The primary value is helping leadership *see issues earlier and act faster*. Concretely:
protecting revenue through earlier intervention on at-risk clients; reducing delivery overruns through
capacity visibility; lifting utilisation of existing people; and cutting the management overhead spent
manually consolidating information. In a real deployment these would be tracked through **revenue
retention, delivery performance, utilisation rates, and reporting efficiency** — the metrics that flow
through to revenue and EBITDA. The honest framing: this system doesn't replace judgement, it removes the
*latency* between a problem existing and leadership knowing about it — and in an agency, that latency is
where margin and clients are lost.

---

## What we'd build next (with more time)

1. **Real ingestion.** Connectors for the actual sources (Harvest/Float for capacity, HubSpot/Salesforce
   for CRM, Jira/Asana for delivery, Xero/QuickBooks for finance) feeding the same normalize layer.
2. **Persisted snapshot history.** Trends currently compare against a reconstructed prior week; storing a
   real time series in Supabase unlocks multi-week sparklines and sentiment trajectories.
3. **Delivery channels for alerts** — actually push the weekly briefing email and threshold alerts to email/Slack
   on a schedule (the content generation is already built).
4. **Configurable thresholds & per-client risk policies**, owned by leadership in-app.
5. **Actions that close the loop — and the agent layer.** "Schedule the retention call," "open a
   change-order task," "flag the invoice" — first as one-click actions with assignees, then as **agents**
   that watch the alert stream and take the first step autonomously (draft + schedule the outreach, open
   the task, chase the data conflict), with a human approving rather than authoring. The grounded engine
   output is the tool surface they'd act on.
6. **Multi-tenant + auth + Supabase RLS**, scenario modeling ("what if we move 2 designers off Orbit"),
   and confidence intervals on the revenue forecast.

---

## Where to look in the code

- The honesty engine: `src/lib/normalize.ts` (turns mess → entities + issues)
- The deterministic scoring: `src/lib/engine/` (`risk.ts`, `capacity.ts`, `revenue.ts`, `attention.ts`)
- The grounded AI: `src/lib/ai/context.ts` (what the model is allowed to know) + `prompts.ts`
- The engine tests: `src/lib/normalize.test.ts` + `src/lib/engine/risk.test.ts` (`pnpm test`)
- See it all in the terminal: `pnpm engine:check`

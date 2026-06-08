# Meridian — Executive Operating System

### ▶ Live demo: **[nine67-exec-os.vercel.app](https://nine67-exec-os.vercel.app)**

*Click through it directly — no login. Running live GPT-4o against a Supabase Postgres backend.*

An AI-powered executive operations tool for a growing agency. It answers one question on open:
**"What should leadership focus on this week?"** — then lets you click into the *why*, the
evidence, and what to do about it.

It's built as an **Executive Operating System, not a dashboard**. The homepage is a ranked
briefing of what needs attention across projects, clients, capacity, and revenue. Charts are
demoted to supporting evidence. And it's honest about messy data — a **Data Confidence** panel
surfaces every conflict, gap, and stale record rather than hiding it.

> Built for the Nine-67 / Suuchi test project. All data is realistic, intentionally-messy sample data.

---

## What it does

| Capability | Where |
| --- | --- |
| **Executive summary** — "state of the business this week" | Homepage hero |
| **AI Insights** — the AI *reads the unstructured field notes* for relationship/political/morale risk the numbers miss | Homepage "what the numbers don't show" panel + per-item "field read" |
| **AI-drafted outreach** — generates the actual email/Slack message to act on a risk | Drill-down "Draft outreach" |
| **Ranked attention items** — what to focus on, in order | Homepage |
| **Risk explanations + recommended actions** (AI) | Each item card + drill-down |
| **Evidence trail** — the deterministic factors + the raw notes/budgets behind each risk | `/item/[id]` |
| **Ask-the-business chat** — grounded Q&A over the whole operation, incl. the qualitative signal | `/ask` |
| **Trend detection** — week-over-week movers (burn accelerating, revenue moving to at-risk, a client going quiet) | Homepage "What changed this week" + trend chips |
| **Automated alerts** — threshold-triggered notifications across budget/client/capacity/revenue/data/trend | `/alerts` + nav bell + homepage banner |
| **Weekly briefing email** — the auto-generated executive briefing email to leadership | `/digest` |
| **Revenue at risk** this quarter, with per-line reasons | Revenue attention item |
| **Capacity pressure** — over-allocated people & resource contention | Capacity attention item |
| **Data Confidence** — conflicts, missing fields, stale records, orphaned signals | Homepage panel |
| **Business case & impact** — the problem, what matters, and how impact is measured (revenue, margin, speed) | `/impact` |

### The core idea: deterministic facts → AI judgment → AI action

- **A deterministic TypeScript engine** owns every number — risk scores, capacity utilization,
  revenue-at-risk, and data-quality flags. Same inputs → same outputs, every time. Fully explainable.
- **An AI judgment layer (GPT-4o)** does what a dashboard can't: it *reads the unstructured field notes*
  and reasons about what the numbers don't show — relationship risk, contradictions, morale, hidden
  dependencies. Advisory, labelled, sitting alongside the hard numbers.
- **An AI generation layer (GPT-4o)** turns findings into artifacts — the summary, the "why," the chat,
  and **drafted outreach** ready to send. Always grounded in the engine's output; never invents figures.

This split is deliberate: the AI does the reasoning and the writing, never the arithmetic — so it *feels*
genuinely intelligent, stays *reliable*, and can be *explained* to a skeptical executive.

---

## Run it locally

Requirements: Node 18+ and `pnpm`.

```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

**It runs with zero configuration.** With no API key and no database it uses the in-repo sample data
and a deterministic, data-grounded fallback for all AI text — so it's never a dead end.

### Turn on live AI (recommended)

Create `.env.local` (see `.env.example`):

```bash
OPENAI_API_KEY=sk-...        # enables live GPT-4o summaries, explanations, and chat
# OPENAI_MODEL=gpt-4o        # optional override
```

Restart `pnpm dev`. The AI badges across the UI switch from **"AI · cached"** to **"Live AI"**.

### Use Supabase as the real data layer (optional)

The app reads in-repo sample data by default. To run it against a real Postgres database:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor (creates mess-tolerant tables + a public read policy).
3. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=ey...
   ```
4. Seed it: `pnpm seed`
5. Restart. The footer now reads **Data source: supabase**.

The same messy values are stored as `text` and flow through the same normalization pipeline, so the
Data Confidence story is identical whether the source is local files or the database.

---

## How it's built

```
src/
  data/raw/            Messy source data — modeled as separate "exports" that disagree
  data/history.ts      Prior-week snapshot reconstruction (powers trend detection)
  lib/
    normalize.ts       Mess → typed entities + a list of every data-quality issue found
    config.ts          Agency identity + fixed as-of date (keeps the demo deterministic)
    engine/            Deterministic risk / capacity / revenue / attention / data-confidence / trends / alerts
    ai/                OpenAI client, grounding context, prompts, digest, + deterministic fallbacks
  app/
    page.tsx           Executive Briefing (homepage)
    item/[id]/page.tsx Drill-down evidence trail
    ask/page.tsx       Ask-the-business chat
    alerts/page.tsx    Threshold-triggered alerts
    digest/page.tsx    Weekly executive briefing email preview
    impact/page.tsx    Business case & impact — ROI framing, engine-derived
    api/chat/route.ts  Streaming, grounded chat endpoint
    api/draft/route.ts AI-drafted outreach endpoint
supabase/schema.sql    Mess-tolerant table definitions
scripts/seed.ts        Idempotent Supabase seed
scripts/engine-check.ts  `pnpm engine:check` — prints briefing, trends, and alerts for inspection
```

**How trend detection works (no fake "trend" text):** `src/data/history.ts` rewinds a handful of real
values to where they were a week ago, and the **same** engine scores that prior snapshot. The deltas
("burn 78%→92%", "revenue at risk +$420k") are therefore computed from two points in time, not asserted.

Useful commands:

```bash
pnpm engine:check   # see the ranked briefing, revenue, capacity, and data issues in the terminal
pnpm test           # unit tests for the deterministic engine (risk, revenue, capacity, parsers)
pnpm typecheck      # tsc --noEmit
pnpm build          # production build
```

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · OpenAI GPT-4o ·
Supabase · Vitest · deployed on Vercel.

---

## Deploy (Vercel)

```bash
vercel            # link & deploy a preview
vercel --prod     # production
```

Set environment variables in the Vercel project: `OPENAI_API_KEY` (for live AI) and, optionally, the
Supabase variables above. The app degrades gracefully if any are missing.

See **DELIVERABLES.md** for assumptions, what gave us pause, and what we'd build next.

# Meridian — Executive Operating System

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
| **Ranked attention items** — what to focus on, in order | Homepage |
| **Risk explanations + recommended actions** (AI) | Each item card + drill-down |
| **Evidence trail** — the deterministic factors + the raw notes/budgets behind each risk | `/item/[id]` |
| **Ask-the-business chat** — grounded Q&A over the whole operation | `/ask` |
| **Trend detection** — week-over-week movers (burn accelerating, revenue moving to at-risk, a client going quiet) | Homepage "What changed this week" + trend chips |
| **Automated alerts** — threshold-triggered notifications across budget/client/capacity/revenue/data/trend | `/alerts` + nav bell + homepage banner |
| **Weekly briefing email** — the auto-generated executive briefing email to leadership | `/digest` |
| **Revenue at risk** this quarter, with per-line reasons | Revenue attention item |
| **Capacity pressure** — over-allocated people & resource contention | Capacity attention item |
| **Data Confidence** — conflicts, missing fields, stale records, orphaned signals | Homepage panel |

### The core idea: deterministic math, AI language

- **A deterministic TypeScript engine** owns every number — risk scores, capacity utilization,
  revenue-at-risk, and data-quality flags. Same inputs → same outputs, every time. Fully explainable.
- **OpenAI (GPT-4o)** owns the *language* — the executive summary, the plain-English "why this
  matters," the recommended actions, and the chat. It's always **grounded** in the engine's output,
  so it explains the business; it never invents it.

This split is deliberate: it *feels* intelligent, stays *reliable*, and can be *explained* to a
skeptical executive.

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
    api/chat/route.ts  Streaming, grounded chat endpoint
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
pnpm typecheck      # tsc --noEmit
pnpm build          # production build
```

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · OpenAI GPT-4o ·
Supabase · deployed on Vercel.

---

## Deploy (Vercel)

```bash
vercel            # link & deploy a preview
vercel --prod     # production
```

Set environment variables in the Vercel project: `OPENAI_API_KEY` (for live AI) and, optionally, the
Supabase variables above. The app degrades gracefully if any are missing.

See **DELIVERABLES.md** for assumptions, what gave us pause, and what we'd build next.

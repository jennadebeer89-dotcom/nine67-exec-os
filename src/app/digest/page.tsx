import Link from "next/link";
import { ArrowLeft, Mail, Clock } from "lucide-react";
import { getExecState } from "@/lib/engine";
import { getWeeklyDigest } from "@/lib/ai";
import { AGENCY } from "@/lib/config";
import { AIBadge } from "@/components/ai-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly Briefing Email · Meridian Executive OS" };

export default async function DigestPage() {
  const state = await getExecState();
  const digest = await getWeeklyDigest(state);
  const c = state.alertCounts;

  // Derive the weekday from the snapshot date — never hardcode it.
  const date = new Date(state.briefing.asOf + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to briefing
      </Link>

      <div className="mt-4 mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Weekly briefing email</h1>
          <p className="mt-1 text-muted-foreground">
            The recurring executive briefing, generated from the current data snapshot. This is a live preview.
          </p>
        </div>
        <AIBadge mode={digest.mode} />
      </div>

      {/* Email envelope */}
      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Email header */}
        <div className="border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{AGENCY.name} Executive OS &lt;briefing@meridian.agency&gt;</p>
              <p className="text-xs text-muted-foreground">to Leadership Team</p>
            </div>
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold text-foreground">
            Weekly Briefing — {date}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> Generated 7:00am · {c.critical} critical / {c.warning} warning alerts
          </p>
        </div>

        {/* Email body */}
        <div className="space-y-6 px-6 py-6">
          <p className="font-display text-lg font-medium leading-snug text-foreground">{digest.headline}</p>

          <p className="text-[15px] leading-relaxed text-foreground/85">{digest.paragraph}</p>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top 3 actions this week</h3>
            <ol className="mt-3 space-y-2.5">
              {digest.actions.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-[15px] leading-relaxed text-foreground">{a}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-risk-medium/30 bg-risk-medium-soft/50 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-risk-medium">Watch</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/85">{digest.watch}</p>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border pt-4 text-sm">
            <Link href="/" className="font-medium text-primary hover:underline">Open the full briefing →</Link>
            <Link href="/alerts" className="font-medium text-primary hover:underline">Review all alerts →</Link>
            <Link href="/ask" className="font-medium text-primary hover:underline">Ask the business →</Link>
          </div>
        </div>
      </article>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        In production this would be delivered via email/Slack on a schedule. Here it&apos;s generated on demand from the
        same engine + AI layer as the dashboard.
      </p>
    </div>
  );
}

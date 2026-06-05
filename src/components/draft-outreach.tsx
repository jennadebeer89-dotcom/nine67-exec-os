"use client";

import { useState } from "react";
import { PenLine, Mail, MessageSquare, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Draft {
  channel: string;
  to: string;
  subject: string;
  body: string;
}

export function DraftOutreach({ itemId }: { itemId: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<"live" | "fallback" | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function generate() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const m = res.headers.get("X-AI-Mode");
      if (m === "live" || m === "fallback") setMode(m);
      if (!res.ok) throw new Error("bad");
      setDraft((await res.json()) as Draft);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!draft) return;
    const text = [draft.subject ? `Subject: ${draft.subject}` : "", draft.body].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const isSlack = draft?.channel?.toLowerCase() === "slack";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Draft the outreach</h2>
        </div>
        {draft && (
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      {!draft && !error && (
        <div className="mt-3 flex flex-col items-start gap-2.5">
          <p className="text-sm text-muted-foreground">
            Let the AI write the actual message to act on this — ready to send, not just advice.
          </p>
          <button
            onClick={generate}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {busy ? "Drafting…" : "Draft outreach"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-muted-foreground">
          Couldn&apos;t generate a draft just now.{" "}
          <button onClick={generate} className="font-medium text-primary hover:underline">
            Try again
          </button>
        </p>
      )}

      {draft && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/40 px-4 py-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              {isSlack ? <MessageSquare className="h-3.5 w-3.5 text-primary" /> : <Mail className="h-3.5 w-3.5 text-primary" />}
              {draft.channel}
            </span>
            <span className="text-muted-foreground">
              to <span className="font-medium text-foreground">{draft.to}</span>
            </span>
            {mode && (
              <span
                className={cn(
                  "ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  mode === "live" ? "border-primary/25 bg-accent text-accent-foreground" : "border-border bg-muted text-muted-foreground",
                )}
              >
                {mode === "live" ? "AI-drafted" : "template"}
              </span>
            )}
          </div>
          <div className="px-4 py-3.5">
            {draft.subject && (
              <p className="mb-2 border-b border-border/60 pb-2 text-sm font-semibold text-foreground">{draft.subject}</p>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{draft.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

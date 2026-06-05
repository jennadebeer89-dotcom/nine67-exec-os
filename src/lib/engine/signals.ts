import type { Note } from "../types";
import type { Evidence } from "./types";

/**
 * Deterministic note signals. We don't use AI for risk detection — that has to be
 * reliable and explainable. Instead we scan status notes for concern/positive cues.
 * The AI layer later *explains* these findings; it doesn't decide them.
 */
const NEGATIVE_CUES = [
  "concern", "at risk", "behind", "slip", "slipping", "over budget", "overrun",
  "blocked", "quiet", "went dark", "went quiet", "no response", "unrealistic",
  "erod", "loss", "late", "paused", "pause", "coin flip", "lose", "losing",
  "scope grew", "no change order", "stretched", "over 100", "unforgiving",
  "competitor", "evaluating options", "evaluating alternatives", "wobble",
];
const POSITIVE_CUES = [
  "happy", "thrilled", "delighted", "on track", "to plan", "healthy",
  "strong relationship", "good reference", "reference client", "tracking to plan",
  "engaged", "positive", "win",
];

export interface NoteSentiment {
  score: number; // negative .. positive (roughly -1..+1 per note averaged)
  negativeCount: number;
  positiveCount: number;
}

export function notesForEntity(notes: Note[], entityId: string): Note[] {
  return notes
    .filter((n) => n.entityId === entityId)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

/** Notes for a client AND its projects (so client risk sees delivery chatter). */
export function relatedNotes(
  notes: Note[],
  opts: { clientId?: string; projectIds?: string[]; team?: string },
): Note[] {
  const ids = new Set<string>();
  if (opts.clientId) ids.add(opts.clientId);
  (opts.projectIds ?? []).forEach((p) => ids.add(p));
  if (opts.team) ids.add(opts.team);
  return notes
    .filter((n) => ids.has(n.entityId))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function scoreSentiment(notes: Note[]): NoteSentiment {
  let neg = 0;
  let pos = 0;
  for (const n of notes) {
    const t = n.text.toLowerCase();
    if (NEGATIVE_CUES.some((c) => t.includes(c))) neg++;
    if (POSITIVE_CUES.some((c) => t.includes(c))) pos++;
  }
  const total = neg + pos;
  return {
    score: total === 0 ? 0 : (pos - neg) / total,
    negativeCount: neg,
    positiveCount: pos,
  };
}

/** Pick the most recent concern-bearing note as headline evidence. */
export function topConcernNote(notes: Note[]): Note | null {
  return (
    notes.find((n) => {
      const t = n.text.toLowerCase();
      return NEGATIVE_CUES.some((c) => t.includes(c));
    }) ?? null
  );
}

export function noteEvidence(n: Note): Evidence {
  return {
    kind: "note",
    label: `${n.author ?? "Unknown"} · ${n.channel ?? "note"}`,
    detail: n.text,
    sourceId: n.id,
    date: n.date,
  };
}

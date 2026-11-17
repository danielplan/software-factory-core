// What the Signals page works out from what the server sends: the address
// of one signal opened, the board's column each signal goes in, what was
// said in quotation marks, and which actions a signal gets. Kept apart from
// the components so it is checked on its own.

import type { SignalView } from "../api.ts";

// #signals, or #signals/<signal>.
export function signalsHash(id?: string): string {
  return id ? `#signals/${encodeURIComponent(id)}` : "#signals";
}

// The signal the address names, if any.
export function idFrom(open: string | null): string | null {
  if (!open) return null;
  return decodeURIComponent(open.split("/")[0] ?? "") || null;
}

// The board's three columns, and where a signal goes: a bug (the kobold
// sorted it so, an error or an alert) under Bugs; a need or an update under
// Requests; everything else (a question, feedback, what is not clear yet)
// under Feedback.
export const COLUMNS = ["bugs", "requests", "feedback"] as const;
export type Column = (typeof COLUMNS)[number];

export function columnOf(signal: Pick<SignalView, "sortedAs">): Column {
  if (signal.sortedAs === "bug") return "bugs";
  if (signal.sortedAs === "need" || signal.sortedAs === "update")
    return "requests";
  return "feedback";
}

// The signals in their columns, each column in the order they came.
export function byColumn<T extends Pick<SignalView, "sortedAs">>(
  signals: T[],
): Record<Column, T[]> {
  const columns: Record<Column, T[]> = { bugs: [], requests: [], feedback: [] };
  for (const signal of signals) columns[columnOf(signal)].push(signal);
  return columns;
}

// What was said, in quotation marks once: marks it already has at its ends
// (straight or curly, single or double) are taken off first.
const MARKS = new Set(['"', "“", "”", "'", "‘", "’", "„", "«", "»"]);

export function quoted(text: string): string {
  let from = 0;
  let to = text.length;
  while (
    from < to &&
    (MARKS.has(text.charAt(from)) || text.charAt(from) === " ")
  )
    from += 1;
  while (
    to > from &&
    (MARKS.has(text.charAt(to - 1)) || text.charAt(to - 1) === " ")
  )
    to -= 1;
  return `“${text.slice(from, to)}”`;
}

// Which actions a signal gets, from where the kobold put it: Fix unless it
// is in Build already; Dismiss unless it is dismissed; "Add to" the idea
// already explored for its problem (when a person can still agree) in
// place of Explore; and agreeing ("Looks right") in the menu otherwise.
export type Triage = {
  fix: boolean;
  dismiss: boolean;
  addTo: { id: string; title: string } | null;
  agreeInMenu: boolean;
};

export function triageOf(
  went: string | undefined,
  agreeable: boolean,
  explored: { id: string; title: string } | null,
): Triage {
  const addTo = agreeable && explored ? explored : null;
  return {
    fix: went !== "build" && went !== "ticket",
    dismiss: went !== "answered",
    addTo,
    agreeInMenu: agreeable && !addTo,
  };
}

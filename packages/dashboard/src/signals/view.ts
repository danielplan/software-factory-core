// What the Signals page works out from what the server sends: what kind of
// thing a signal is (from how the kobold sorted it), the page's address for
// one signal, and which signal is shown, so that after one is fixed,
// explored or dismissed (and leaves the list) the next one is shown. Kept
// apart from the components so it is checked on its own.

import type { SignalView } from "../api.ts";

export type SignalKind = "bug" | "need" | "update" | "question" | "other";

export function kindOf(signal: Pick<SignalView, "sortedAs">): SignalKind {
  switch (signal.sortedAs) {
    case "bug":
    case "need":
    case "update":
    case "question":
      return signal.sortedAs;
    default:
      return "other";
  }
}

// #signals, or #signals/<signal>.
export function signalsHash(id?: string): string {
  return id ? `#signals/${encodeURIComponent(id)}` : "#signals";
}

// The signal the address names, if any.
export function idFrom(open: string | null): string | null {
  if (!open) return null;
  return decodeURIComponent(open.split("/")[0] ?? "") || null;
}

// What was shown last time, and the list it was in.
export type Shown = { ids: string[]; shown: string | null };

// The signal to show: the one the address names while it is in the list;
// else the one shown before, while it is still there; else, when that one
// left the list (it was handled), the one now at its place; else the first.
export function shownOf(
  before: Shown,
  ids: string[],
  wanted: string | null,
): string | null {
  if (wanted && ids.includes(wanted)) return wanted;
  if (before.shown && ids.includes(before.shown)) return before.shown;
  if (before.shown) {
    const at = before.ids.indexOf(before.shown);
    if (at >= 0 && ids.length > 0)
      return ids[Math.min(at, ids.length - 1)] ?? null;
  }
  return ids[0] ?? null;
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

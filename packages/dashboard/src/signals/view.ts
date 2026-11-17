// What the Signals page works out from what the server sends: the page's
// address for one signal, which signal is shown (so that after one is
// fixed, explored or dismissed, and leaves the list, the next one is
// shown), where it stands among them, and what was said in quotation
// marks. Kept apart from the components so it is checked on its own.

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

// Where the one shown stands ("3 of 14"), and the ones before and after it.
export function neighbours(
  ids: string[],
  shown: string | null,
): { at: number; before: string | null; after: string | null } {
  const at = Math.max(shown ? ids.indexOf(shown) : 0, 0);
  return {
    at,
    before: ids[at - 1] ?? null,
    after: ids[at + 1] ?? null,
  };
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

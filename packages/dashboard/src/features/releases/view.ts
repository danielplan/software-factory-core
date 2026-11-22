// What the Releases page shows, worked out from what the server sends: which
// state the page is in, and whether the number typed can be released. Kept
// apart from the components so it is checked on its own.

import type { ReleasesView } from "../../api/client.ts";
import type { Read } from "../../api/use-read.ts";

type Connected = Extract<ReleasesView, { connected: true }>;

export type Shown =
  | { state: "loading" }
  | { state: "problem"; text: string }
  | { state: "no-repository" }
  | { state: "ready"; view: Connected };

export function shownOf(read: Read<ReleasesView>): Shown {
  if (read.problem) return { state: "problem", text: read.problem };
  if (!read.data) return { state: "loading" };
  return read.data.connected
    ? { state: "ready", view: read.data }
    : { state: "no-repository" };
}

const NUMBER = /^(\d+)\.(\d+)\.(\d+)$/;

function partsOf(number: string): number[] | null {
  const found = NUMBER.exec(number.trim());
  return found ? found.slice(1).map(Number) : null;
}

export type Problem = "not-a-number" | "not-higher";

// Why the number typed cannot be released; none when it can. The server
// checks it again (and that the tag is new).
export function problemWith(
  number: string,
  last: string | null,
): Problem | null {
  const parts = partsOf(number);
  if (!parts) return "not-a-number";
  const before = last ? partsOf(last) : null;
  return before && !higher(parts, before) ? "not-higher" : null;
}

function higher(a: number[], b: number[]): boolean {
  const at = a.findIndex((part, n) => part !== b[n]);
  return at >= 0 && (a[at] ?? 0) > (b[at] ?? 0);
}

// What the line beside the number says: the kobold's reason, or why there
// is none.
export type Why =
  | { kind: "said"; text: string }
  | { kind: "first" }
  | { kind: "unknown" }
  | { kind: "nothing" };

export function whyOf(view: Connected): Why {
  if (view.coming.merged.length === 0) return { kind: "nothing" };
  if (view.coming.why) return { kind: "said", text: view.coming.why };
  return view.last === null ? { kind: "first" } : { kind: "unknown" };
}

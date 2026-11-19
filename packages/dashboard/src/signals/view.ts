// What the Signals and Personas pages say, worked out from what the server
// sends: the words for a signal's type and source, who it is from, which
// button comes first, the line about work that exists already, and when the
// live app was last read. Kept apart from the components so it is checked
// on its own.

import type { SignalRow, SyncView } from "../api.ts";

type Signal = Pick<
  SignalRow,
  "type" | "source" | "personaName" | "already" | "workColumn"
>;

export const TYPE_WORDS: Record<Signal["type"], string> = {
  bug: "Bug",
  request: "Feature request",
  feedback: "Feedback",
};

export const SOURCE_WORDS: Record<Signal["source"], string> = {
  app: "In the app",
  usage: "Usage",
  errors: "Errors",
  test: "Persona test",
};

export function whoOf(signal: Pick<Signal, "personaName">): string {
  return signal.personaName ?? "Someone";
}

// The type only decides which button comes first: Fix for a bug, Explore
// for anything else. Every button is always there.
export function primaryOf(signal: Pick<Signal, "type">): "fix" | "explore" {
  return signal.type === "bug" ? "fix" : "explore";
}

export function exploreWords(signal: Pick<Signal, "already">): string {
  return signal.already?.kind === "exploration"
    ? `Add to ${signal.already.id}`
    : "Explore";
}

// The one plain line about work that exists already ("Already explored in"
// and "X-1 · its title"), or null.
export function alreadyLine(
  signal: Pick<Signal, "already" | "workColumn">,
): { words: string; what: string; column: string | null } | null {
  const { already } = signal;
  if (!already) return null;
  return {
    words:
      already.kind === "exploration"
        ? "Already explored in"
        : "Already fixed in",
    what: `${already.id} · ${already.title}`,
    column:
      already.kind === "work" && signal.workColumn
        ? `(${signal.workColumn})`
        : null,
  };
}

const MINUTE = 60_000;

// How long ago a time was, in plain words.
export function agoOf(at: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(at)) / MINUTE);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${String(minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${String(days)} days ago`;
}

// The line beside the page's title about the live app.
export function syncLine(sync: SyncView, now: Date): string {
  if (!sync.connected) return "Not connected to the live app";
  if (!sync.last) return "Not synced with the live app yet · every 30 min";
  return `Synced with the live app ${agoOf(sync.last, now)} · every 30 min`;
}

// The signal shown: the one picked while it is still new, else the first.
export function shownOf<T extends { id: string }>(
  signals: T[],
  picked: string | null,
): T | null {
  return signals.find((one) => one.id === picked) ?? signals[0] ?? null;
}

// After a signal is handled, the one that takes its place in the list.
export function nextAfter(
  signals: { id: string }[],
  handled: string,
): string | null {
  const at = signals.findIndex((one) => one.id === handled);
  const rest = signals.filter((one) => one.id !== handled);
  return rest[Math.min(Math.max(at, 0), rest.length - 1)]?.id ?? null;
}

export function countWords(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

// A persona keeps the same soft colour on every page: one picked from its id.
export function tintIndexOf(id: string): number {
  let sum = 0;
  for (let at = 0; at < id.length; at++) sum += id.charCodeAt(at);
  return sum;
}

export function originWords(origin: "developer" | "usage"): string {
  return origin === "usage" ? "Found in usage" : "Added by you";
}

// What became of a signal, in a few words.
export function statusWords(signal: Pick<SignalRow, "status" | "to">): string {
  if (signal.status === "explored" && signal.to)
    return `Explored in ${signal.to}`;
  if (signal.status === "fixed")
    return signal.to ? `Fixed in ${signal.to}` : "Sent to be fixed";
  return signal.status === "new" ? "New" : "Dismissed";
}

export const TEST_WORDS: Record<
  "queued" | "running" | "done" | "failed",
  string
> = {
  queued: "Waiting",
  running: "Testing…",
  done: "Done",
  failed: "Failed",
};

// On a persona's page, what is open: their signals (#personas/<id>), their
// tests (#personas/<id>/tests) or one test (#personas/<id>/tests/<test>).
export function personaPlaceOf(open: string): {
  persona: string;
  tab: "signals" | "tests";
  test: string | null;
} {
  const [persona = "", tab, test] = open
    .split("/")
    .map((part) => decodeURIComponent(part));
  return {
    persona,
    tab: tab === "tests" ? "tests" : "signals",
    test: tab === "tests" && test ? test : null,
  };
}

// When the kobold reads the live app again, in words.
export function lookAgainWords(next: string | null, now: Date): string {
  if (!next) return "The kobold looks again soon.";
  const minutes = Math.ceil((Date.parse(next) - now.getTime()) / MINUTE);
  if (minutes <= 1) return "The kobold looks again in a minute.";
  return `The kobold looks again in ${String(minutes)} minutes.`;
}

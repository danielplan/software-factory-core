// What the Signals and Personas pages say, worked out from what the server
// sends: the words for a signal's type and source, who it is from, which
// button comes first, the line about work that exists already, and when the
// live app was last read. Kept apart from the components so it is checked
// on its own.

import type { MissionNow, SignalRow, SyncView } from "../api/client.ts";
import { ENGLISH, type Messages } from "../i18n/messages.ts";

type Words = Messages["words"];
const W = ENGLISH.words;

type Signal = Pick<
  SignalRow,
  "type" | "source" | "personaName" | "already" | "workColumn"
>;

export const TYPE_WORDS: Record<Signal["type"], string> = W.types;

export function whoOf(
  signal: Pick<Signal, "personaName">,
  m: Words = W,
): string {
  return signal.personaName ?? m.someone;
}

// The type only decides which button comes first: Fix for a bug, Explore
// for anything else. Every button is always there.
export function primaryOf(signal: Pick<Signal, "type">): "fix" | "explore" {
  return signal.type === "bug" ? "fix" : "explore";
}

export function exploreWords(
  signal: Pick<Signal, "already">,
  m: Words = W,
): string {
  return signal.already?.kind === "exploration"
    ? m.addTo(signal.already.id)
    : m.explore;
}

// The one plain line about work that exists already ("Already explored in"
// and "X-1 · its title"), or null.
export function alreadyLine(
  signal: Pick<Signal, "already" | "workColumn">,
  m: Words = W,
): { words: string; what: string; column: string | null } | null {
  const { already } = signal;
  if (!already) return null;
  return {
    words: already.kind === "exploration" ? m.alreadyExplored : m.alreadyFixed,
    what: `${already.id} · ${already.title}`,
    column:
      already.kind === "work" && signal.workColumn
        ? `(${signal.workColumn})`
        : null,
  };
}

const MINUTE = 60_000;

// How long ago a time was, in plain words.
export function agoOf(at: string, now: Date, m: Words = W): string {
  const minutes = Math.floor((now.getTime() - Date.parse(at)) / MINUTE);
  if (minutes < 1) return m.ago.now;
  if (minutes < 60) return m.ago.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return m.ago.hours(hours);
  const days = Math.floor(hours / 24);
  return days === 1 ? m.ago.yesterday : m.ago.days(days);
}

// The line beside the page's title about the live app.
export function syncLine(sync: SyncView, now: Date, m: Words = W): string {
  if (!sync.connected) return m.sync.notConnected;
  if (!sync.last) return m.sync.notYet;
  return m.sync.synced(agoOf(sync.last, now, m));
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

export function originWords(
  origin: "developer" | "usage",
  m: Words = W,
): string {
  return m.origin[origin];
}

// What became of a signal, in a few words.
export function statusWords(
  signal: Pick<SignalRow, "status" | "to">,
  m: Words = W,
): string {
  if (signal.status === "explored" && signal.to)
    return m.status.explored(signal.to);
  if (signal.status === "fixed")
    return signal.to ? m.status.fixed(signal.to) : m.status.sentToFix;
  return signal.status === "new" ? m.status.new : m.status.dismissed;
}

// A mission running or waiting, in a few words: the step it is on.
export function missionWords(
  mission: Pick<MissionNow, "status" | "doing">,
  m: Words = W,
): string {
  if (mission.status === "queued") return m.mission.queued;
  return mission.doing ?? m.mission.opening;
}

// Where a signal from a mission happened: "At step 2: Opened the basket".
export function stepWords(
  signal: Pick<SignalRow, "step">,
  m: Words = W,
): string | null {
  return signal.step ? m.step(signal.step.number, signal.step.did) : null;
}

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
export function lookAgainWords(
  next: string | null,
  now: Date,
  m: Words = W,
): string {
  if (!next) return m.lookAgain.soon;
  const minutes = Math.ceil((Date.parse(next) - now.getTime()) / MINUTE);
  if (minutes <= 1) return m.lookAgain.minute;
  return m.lookAgain.minutes(minutes);
}

export type Act = "fix" | "explore" | "dismiss";

// What a button did, in words.
export function doneWords(
  act: Act,
  signal: SignalRow,
  answer: unknown,
  m: Words = W,
): string {
  if (act === "fix") {
    const fixed = (answer as { signal: { to: string | null } }).signal.to;
    return m.done.fixed(fixed ?? signal.id);
  }
  if (act === "dismiss") return m.done.dismissed;
  const { exploration } = answer as { exploration: { id: string } };
  return signal.already?.kind === "exploration"
    ? m.done.added(exploration.id)
    : m.done.waiting(exploration.id);
}

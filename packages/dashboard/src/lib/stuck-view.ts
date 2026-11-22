// What a stuck card says on the Factory page: why the builder stopped, in
// one plain line, and for how long. Kept apart from the page so it is
// checked on its own.

import type { FactoryView } from "../../../server/src/extensions/factory/factory-view.ts";
import { ENGLISH, type Messages } from "../i18n/messages.ts";

export type Stuck = FactoryView["stuck"][number];

const LONGEST = 220;

// Why the builder stopped, in one line: its question, or that it gave up.
export function reasonOf(
  stuck: Stuck,
  m: Messages["builder"]["why"] = ENGLISH.builder.why,
): string {
  if (stuck.note === "checks-failed") return m.checksFailed;
  if (stuck.note === "failed") return m.failed;
  if (stuck.note === "out-of-sessions") return m.outOfSessions;
  if (stuck.ask) return m.asks(stuck.ask.question);
  const first =
    stuck.text
      .split(/\n\s*\n/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .find(Boolean) ?? "";
  if (!first) return m.stopped;
  return first.length > LONGEST ? `${first.slice(0, LONGEST - 1)}…` : first;
}

const MINUTE = 60_000;

// How long it has been stuck, in plain words.
export function stuckFor(
  since: string,
  now: Date,
  m: Messages["builder"]["since"] = ENGLISH.builder.since,
): string {
  const minutes = Math.floor((now.getTime() - Date.parse(since)) / MINUTE);
  if (!Number.isFinite(minutes) || minutes < 1) return m.justNow;
  if (minutes < 60) return m.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return m.hours(hours);
  return m.days(Math.floor(hours / 24));
}

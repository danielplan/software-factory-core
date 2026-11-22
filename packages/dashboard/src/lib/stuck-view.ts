// What a stuck card says on the Factory page: why the builder stopped, in
// one plain line, and for how long. Kept apart from the page so it is
// checked on its own.

import type { TFunction } from "i18next";
import type { FactoryView } from "../api/schemas/factory.ts";
import { ENGLISH } from "../i18n/messages.ts";

export type Stuck = FactoryView["stuck"][number];

const LONGEST = 220;

// Why the builder stopped, in one line: its question, or that it gave up.
export function reasonOf(stuck: Stuck, m: TFunction = ENGLISH): string {
  if (stuck.note === "checks-failed") return m("builder.why.checksFailed");
  if (stuck.note === "failed") return m("builder.why.failed");
  if (stuck.note === "out-of-sessions") return m("builder.why.outOfSessions");
  if (stuck.ask) return m("builder.why.asks", { question: stuck.ask.question });
  const first =
    stuck.text
      .split(/\n\s*\n/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .find(Boolean) ?? "";
  if (!first) return m("builder.why.stopped");
  return first.length > LONGEST ? `${first.slice(0, LONGEST - 1)}…` : first;
}

const MINUTE = 60_000;

// How long it has been stuck, in plain words.
export function stuckFor(
  since: string,
  now: Date,
  m: TFunction = ENGLISH,
): string {
  const minutes = Math.floor((now.getTime() - Date.parse(since)) / MINUTE);
  if (!Number.isFinite(minutes) || minutes < 1)
    return m("builder.since.justNow");
  if (minutes < 60) return m("builder.since.minutes", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return m("builder.since.hours", { n: hours });
  return m("builder.since.days", { count: Math.floor(hours / 24) });
}

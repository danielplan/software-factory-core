// What a stuck card says on the Factory page: why the builder stopped, in
// one plain line, and for how long. Kept apart from the page so it is
// checked on its own.

import type { FactoryView } from "../../../server/src/kobble/factory-view.ts";

export type Stuck = FactoryView["stuck"][number];

const LONGEST = 220;

// Why the builder stopped, in one line: its question, or that it gave up.
export function reasonOf(stuck: Stuck): string {
  if (stuck.note === "checks-failed")
    return "The checks stayed red after three tries.";
  if (stuck.note === "failed") return "The builder could not finish it.";
  if (stuck.ask) return `The builder asks: ${stuck.ask.question}`;
  const first =
    stuck.text
      .split(/\n\s*\n/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .find(Boolean) ?? "";
  if (!first) return "The builder stopped and asks you.";
  return first.length > LONGEST ? `${first.slice(0, LONGEST - 1)}…` : first;
}

const MINUTE = 60_000;

// How long it has been stuck, in plain words.
export function stuckFor(since: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(since)) / MINUTE);
  if (!Number.isFinite(minutes) || minutes < 1) return "Stuck just now";
  if (minutes < 60) return `Stuck for ${String(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Stuck for ${String(hours)} h`;
  const days = Math.floor(hours / 24);
  return `Stuck for ${String(days)} ${days === 1 ? "day" : "days"}`;
}

// What the name tags, the sidebar's "Your kobolds" and the panel say, worked
// out from what the page already knows about prototypes, builds, persona
// tests and signals. Kept apart from the components so it is checked on its
// own.

import type { TFunction } from "i18next";

import type { ExplorationRow, WorkView } from "../api/client.ts";
import type { DoingKind } from "../../../core/src/kobble/doing.ts";
import { ENGLISH } from "../i18n/messages.ts";
import { type Member, TEAM, type TeamId } from "./kobolds.ts";

type Words = TFunction;

// What each kobold does now, in a few words; the resting ones are left out.
export type Now = Partial<Record<TeamId, string>>;

// How long making a version typically takes. No run records how long a
// making took, so the estimate counts down from this.
export const TYPICAL_MAKING_MINUTES = 3;

// The minutes left of a version being made, never below one; 0 once it
// takes longer than usual (or when nobody knows when it began).
export function minutesLeft(since: string | null, now: number): number {
  if (!since) return TYPICAL_MAKING_MINUTES;
  const elapsed = Math.floor((now - Date.parse(since)) / 60_000);
  return Math.max(0, TYPICAL_MAKING_MINUTES - Math.max(0, elapsed));
}

export function soonWords(
  since: string | null,
  now: number,
  m: Words = ENGLISH,
): string {
  const left = minutesLeft(since, now);
  return left > 0
    ? m("meet.soon.minutes", { count: left })
    : m("meet.soon.longer");
}

// --- The name tags' grey line (the second line under "Name · role").

export function makerTag(
  making: { version: string; since: string | null },
  now: number,
  m: Words = ENGLISH,
): string {
  return m("meet.tag.maker", {
    version: making.version,
    soon: soonWords(making.since, now, m),
  });
}

export function builderTag(
  number: number,
  activity: string | null,
  m: Words = ENGLISH,
): string {
  return activity
    ? m("meet.tag.builderAt", { number, activity })
    : m("meet.tag.builder", { number });
}

export function testerTag(
  test: { status: string; steps: number },
  persona: string,
  m: Words = ENGLISH,
): string | null {
  if (test.status === "queued") return m("meet.tag.testerQueued", { persona });
  if (test.status === "running")
    return m("meet.tag.testerRunning", { persona, step: test.steps + 1 });
  // A test that failed did not finish playing: Mimic has nothing to say.
  if (test.status === "failed") return null;
  return m("meet.tag.testerDone", { persona, count: test.steps });
}

export function sorterTag(count: number, m: Words = ENGLISH): string {
  return count > 0
    ? m("meet.tag.sorter", { count })
    : m("meet.tag.sorterQuiet");
}

// --- The live lines (the sidebar's group and the panel). A kobold with no
// line rests.

export function makerNow(
  making: { version: string; doing: DoingKind | null } | null,
  m: Words = ENGLISH,
): string | null {
  if (!making) return null;
  return making.doing
    ? m("meet.now.maker", {
        version: making.version,
        activity: m(`explore.doing.${making.doing}`),
      })
    : m("meet.now.makerAtWork", { version: making.version });
}

export function testerNow(
  personas: string[],
  m: Words = ENGLISH,
): string | null {
  const [first] = personas;
  if (first === undefined) return null;
  return personas.length === 1
    ? m("meet.now.tester", { persona: first })
    : m("meet.now.testers", { count: personas.length });
}

export function sorterNow(count: number, m: Words = ENGLISH): string | null {
  return count > 0 ? m("meet.now.sorter", { count }) : null;
}

// --- What each kobold did last, where the page knows it.

// The latest card that reached Review or Done.
export function builtLast(
  work: WorkView | null,
  m: Words = ENGLISH,
): string | null {
  const built = (work?.cards ?? [])
    .filter((card) => card.stage === "review" || card.stage === "done")
    .sort((a, b) => b.number - a.number)[0];
  return built
    ? m("meet.last.builder", { number: built.number, title: built.title })
    : null;
}

export function exploredLast(
  rows: Pick<ExplorationRow, "title">[],
  m: Words = ENGLISH,
): string | null {
  const [row] = rows;
  return row ? m("meet.last.explorer", { title: row.title }) : null;
}

export function madeLast(
  rows: Pick<ExplorationRow, "things">[],
  m: Words = ENGLISH,
): string | null {
  const made = rows
    .flatMap((row) => row.things)
    .filter((thing) => thing.kind === "prototype")
    .at(-1);
  return made ? m("meet.last.maker", { label: made.label }) : null;
}

// --- Who is shown, working or resting, lit.

// The sidebar lists everybody; Tinker, Doodle's helper, only while it
// works.
export function shownInGroup(now: Now): Member[] {
  return TEAM.filter((one) => one.id !== "maker" || now.maker !== undefined);
}

export const isWorking = (now: Now, id: TeamId): boolean =>
  now[id] !== undefined;

// The kobold you came from is lit.
export const isLit = (focus: TeamId | null, id: TeamId): boolean =>
  focus === id;

// What the panel says under the card's name: what it does now, else what it
// did last.
export function lineOf(
  now: Now,
  last: Now,
  id: TeamId,
): { now: string | null; last: string | null } {
  return { now: now[id] ?? null, last: last[id] ?? null };
}

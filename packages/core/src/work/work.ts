// The piece of work: the board's card. It is the one thing every extension
// shares, and for now the only piece of work there is. It has a stage and a
// history of where it has been; extensions add their part to it (a few words
// under their own id) and hear when it moves. Work moves on only when its
// stage's checks have passed, so no stage is skipped and none is left before
// what it asks for holds. Sending work back to an earlier stage needs no
// checks: it starts that stage's checks again.
//
// Kobble's own stages stay as they are, with no checks: a card is in Build
// (its board column says so) until it is Done, unless the team's own stage
// holds it. Only a team's stage is kept on the card (a label, and a section
// of its text); a card with none of that is where its board column puts it,
// so every card has a stage from the start.
//
// This is plain data and plain functions: where cards are kept (the board)
// and who hears of a move is the server's.

import type { Check } from "../extensions/extension.ts";

export type Move = {
  // Null for the first stage a piece of work is put in.
  from: string | null;
  to: string;
  at: string;
  // Who moved it: a person's name, or an extension's id.
  by: string;
};

export type Work = {
  // The card's number.
  id: string;
  title: string;
  stage: string;
  // The ids of the checks of the current stage that have passed.
  passed: string[];
  history: Move[];
  // What each extension keeps on it, by the extension's id.
  parts: Record<string, Record<string, string>>;
};

// Said to every extension that listens when a piece of work moves.
export type Moved = { work: Work; from: string | null; to: string };

// The stages in the order the team has them, each with the checks it asks.
export type Course = { id: string; checks: Check[] }[];

export type Outcome = { work: Work } | { refused: string };

// The checks of the stage the work is in that have not passed yet.
export function openChecks(work: Work, course: Course): Check[] {
  const here = course.find((stage) => stage.id === work.stage);
  return (here?.checks ?? []).filter(
    (check) => !work.passed.includes(check.id),
  );
}

// A check of the stage the work is in has passed.
export function passCheck(work: Work, course: Course, check: string): Outcome {
  const here = course.find((stage) => stage.id === work.stage);
  if (!here?.checks.some((one) => one.id === check))
    return {
      refused: `The stage "${work.stage}" asks for no check "${check}".`,
    };
  return {
    work: { ...work, passed: [...new Set([...work.passed, check])] },
  };
}

// The work moves to `to`: the next stage once every check of this one has
// passed, or any earlier stage (sent back).
export function moveWork(
  work: Work,
  to: string,
  course: Course,
  by: string,
  at: string,
): Outcome {
  const now = course.findIndex((stage) => stage.id === work.stage);
  const next = course.findIndex((stage) => stage.id === to);
  if (next < 0) return { refused: `There is no stage "${to}".` };
  if (now < 0)
    return {
      refused: `The stage "${work.stage}" is not in the order any more.`,
    };
  if (next === now) return { refused: `It is in "${to}" already.` };
  if (next > now) {
    if (next > now + 1)
      return { refused: "Work goes through every stage: one at a time." };
    const open = openChecks(work, course);
    if (open.length > 0)
      return {
        refused: `Not yet: ${open.map((check) => check.name).join("; ")}.`,
      };
  }
  return {
    work: {
      ...work,
      stage: to,
      passed: [],
      history: [...work.history, { from: work.stage, to, at, by }],
    },
  };
}

// An extension keeps a few words on the piece of work, under its own id.
export function addPart(
  work: Work,
  extension: string,
  key: string,
  value: string,
): Work {
  return {
    ...work,
    parts: {
      ...work.parts,
      [extension]: { ...work.parts[extension], [key]: value },
    },
  };
}

// Kobble's own stages a card goes through: Build (from its board column To do
// to Review) and Done. Between them, and nowhere else, a team's stage can
// hold a card.
export const BUILD_STAGE = "build";
export const DONE_STAGE = "done";

// What a card keeps of its piece of work: the stage that holds it now, the
// checks of it that have passed, its history and the extensions' parts.
export type Kept = Pick<Work, "stage" | "passed" | "history" | "parts">;

// The stages a card can be in: Build, the team's stages between Build and
// Done, and Done. `kobbles` are the stages of Kobble's own extensions, which
// hold no card but Build and Done. Empty when Done does not come after Build.
export function cardCourse(course: Course, kobbles: readonly string[]): Course {
  const from = course.findIndex((stage) => stage.id === BUILD_STAGE);
  const to = course.findIndex((stage) => stage.id === DONE_STAGE);
  if (from < 0 || to <= from) return [];
  return course
    .slice(from, to + 1)
    .filter(
      (stage) =>
        stage.id === BUILD_STAGE ||
        stage.id === DONE_STAGE ||
        !kobbles.includes(stage.id),
    );
}

// The label that puts a card in a team's stage ("stage: checklist").
const STAGE_LABEL = "stage: ";
export const stageLabel = (stage: string): string => `${STAGE_LABEL}${stage}`;

// The team's stage a card's labels put it in; none when they put it in none.
export function labelledStage(labels: readonly string[]): string | null {
  const found = labels.find((label) => label.startsWith(STAGE_LABEL));
  return found ? found.slice(STAGE_LABEL.length) : null;
}

// What the board says of a card.
export type OnBoard = {
  number: number;
  title: string;
  // Its board column is Done (the factory's stage for it).
  done: boolean;
  closed: boolean;
  labels: readonly string[];
};

// The stage a card is in: the team's stage its label names while it is not
// finished and that stage is still there; else Done when it is finished
// (closed, or in the Done column); else Build.
export function stageOfCard(card: OnBoard, course: Course): string {
  if (card.done || card.closed) return DONE_STAGE;
  const held = labelledStage(card.labels);
  return held !== null && course.some((stage) => stage.id === held)
    ? held
    : BUILD_STAGE;
}

// The card as a piece of work. What it kept counts only for the stage it
// kept it in: a card moved on the board since starts its checks again.
export function pieceOf(
  card: OnBoard,
  kept: Kept | null,
  course: Course,
): Work {
  const stage = stageOfCard(card, course);
  return {
    id: String(card.number),
    title: card.title,
    stage,
    passed: kept && kept.stage === stage ? kept.passed : [],
    history: kept?.history ?? [],
    parts: kept?.parts ?? {},
  };
}

// The stage a moved piece of work is kept in: a team's stage is kept on the
// card; Build and Done are where the board puts it, so nothing is kept.
export const isHeld = (stage: string): boolean =>
  stage !== BUILD_STAGE && stage !== DONE_STAGE;

const SECTION_START = "<!-- factory:work\n";
const SECTION_END = "\n-->";

// The card's text with what the piece of work keeps in it, in place of what
// it kept before. `<` and `>` are written as escapes so the JSON can never
// end its own comment.
export function withKept(body: string, kept: Kept | null): string {
  const bare = withoutKept(body);
  if (kept === null) return bare;
  const json = JSON.stringify(kept, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");
  const section = `${SECTION_START}${json}${SECTION_END}`;
  return `${[bare.trimEnd(), section].filter((part) => part !== "").join("\n\n")}\n`;
}

// What the card's text keeps of its piece of work; none when it keeps none or
// what it keeps is not a piece of work.
export function keptIn(body: string): Kept | null {
  const at = body.indexOf(SECTION_START);
  if (at < 0) return null;
  const from = at + SECTION_START.length;
  const end = body.indexOf(SECTION_END, from);
  if (end < 0) return null;
  try {
    const read = JSON.parse(body.slice(from, end)) as Record<string, unknown>;
    return typeof read.stage === "string" &&
      Array.isArray(read.passed) &&
      read.passed.every((one) => typeof one === "string") &&
      Array.isArray(read.history) &&
      typeof read.parts === "object" &&
      read.parts !== null
      ? (read as unknown as Kept)
      : null;
  } catch {
    return null;
  }
}

// The card's text without what its piece of work keeps.
export function withoutKept(body: string): string {
  const at = body.indexOf(SECTION_START);
  const end = at < 0 ? -1 : body.indexOf(SECTION_END, at);
  if (at < 0 || end < 0) return body;
  return [
    body.slice(0, at).trimEnd(),
    body.slice(end + SECTION_END.length).trim(),
  ]
    .filter((part) => part !== "")
    .join("\n\n");
}

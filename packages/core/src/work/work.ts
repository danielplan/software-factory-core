// The piece of work: the one thing every extension shares. It has a stage and
// a history of where it has been; extensions add their part to it (a few
// words under their own id) and hear when it moves. Work moves on only when
// its stage's checks have passed, so no stage is skipped and none is left
// before what it asks for holds. Sending work back to an earlier stage needs
// no checks: it starts that stage's checks again.
//
// This is plain data and plain functions: where pieces are kept (the
// factory's files) and who hears of a move is the server's.

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

export function startWork(
  id: string,
  title: string,
  course: Course,
  by: string,
  at: string,
): Outcome {
  const first = course[0];
  if (!first) return { refused: "There is no stage for work to start in." };
  return {
    work: {
      id,
      title,
      stage: first.id,
      passed: [],
      history: [{ from: null, to: first.id, at, by }],
      parts: {},
    },
  };
}

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

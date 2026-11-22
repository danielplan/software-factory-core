// The pieces of work of the team's own stages, kept in the factory's folder
// (factory/work.json) with their stage and history. The core's rules say
// when one may move (a stage's checks must have passed); this keeps them,
// answers the page, and tells everyone who listens when one moves.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  type Course,
  FACTORY_FOLDER,
  moveWork,
  type Moved,
  type Outcome,
  openChecks,
  passCheck,
  startWork,
  type Work,
} from "@software-factory/core";

import type { Route } from "./add-ons/add-on.ts";
import { Refused } from "./refused.ts";

const FILE = "work.json";
// More pieces than any factory holds at once: a guard against a file that is
// not one.
const MOST = 5000;

const isWork = (one: unknown): one is Work => {
  if (typeof one !== "object" || one === null) return false;
  const work = one as Record<string, unknown>;
  return (
    typeof work.id === "string" &&
    typeof work.title === "string" &&
    typeof work.stage === "string" &&
    Array.isArray(work.passed) &&
    Array.isArray(work.history) &&
    typeof work.parts === "object" &&
    work.parts !== null
  );
};

// The pieces in the file; none when there is no file or it is not one.
export function readWork(root: string): Work[] {
  const file = join(root, FILE);
  if (!existsSync(file)) return [];
  try {
    const read = JSON.parse(readFileSync(file, "utf8")) as { pieces?: unknown };
    return Array.isArray(read.pieces) &&
      read.pieces.length <= MOST &&
      read.pieces.every(isWork)
      ? read.pieces
      : [];
  } catch {
    return [];
  }
}

function keep(root: string, pieces: Work[]): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, FILE), `${JSON.stringify({ pieces }, null, 2)}\n`);
}

// How many pieces are in each stage.
export function countByStage(pieces: Work[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const piece of pieces)
    counts[piece.stage] = (counts[piece.stage] ?? 0) + 1;
  return counts;
}

const text = (value: unknown, what: string): string => {
  if (typeof value !== "string" || value.trim() === "")
    throw new Refused(`Say ${what}.`);
  return value.trim().slice(0, 200);
};

const settled = (outcome: Outcome): Work => {
  if ("refused" in outcome) throw new Refused(outcome.refused);
  return outcome.work;
};

const whoOf = (by: unknown): string =>
  typeof by === "string" && by.trim() ? by.trim().slice(0, 80) : "team";

function find(pieces: Work[], id: unknown): Work {
  const found = pieces.find((one) => one.id === id);
  if (!found) throw new Refused("There is no such piece of work.");
  return found;
}

const replace = (pieces: Work[], work: Work) =>
  pieces.map((one) => (one.id === work.id ? work : one));

export function workRoutes(host: {
  project: string;
  // The stages in the team's order, with their checks, as they are now.
  course: () => Course;
  changed: (what: string) => void;
  // Told when a piece moves, if anyone listens besides the page.
  heard?: (moved: Moved) => void;
  now?: () => string;
}): Record<string, Route> {
  const root = join(host.project, FACTORY_FOLDER);
  const now = host.now ?? (() => new Date().toISOString());
  const body = (given: unknown) => (given ?? {}) as Record<string, unknown>;
  return {
    "GET /api/work-pieces": () => ({
      pieces: readWork(root).map((piece) => ({
        ...piece,
        open: openChecks(piece, host.course()),
      })),
    }),
    "POST /api/work-pieces": (given) => {
      const { title, by } = body(given);
      const started = settled(
        startWork(
          randomUUID(),
          text(title, "what the work is"),
          host.course(),
          whoOf(by),
          now(),
        ),
      );
      keep(root, [...readWork(root), started]);
      host.changed("work");
      return { id: started.id };
    },
    "POST /api/work-pieces/check": (given) => {
      const { id, check } = body(given);
      const pieces = readWork(root);
      const passed = settled(
        passCheck(find(pieces, id), host.course(), text(check, "the check")),
      );
      keep(root, replace(pieces, passed));
      host.changed("work");
    },
    "POST /api/work-pieces/move": (given) => {
      const { id, to, by } = body(given);
      const pieces = readWork(root);
      const before = find(pieces, id);
      const moved = settled(
        moveWork(
          before,
          text(to, "the stage"),
          host.course(),
          whoOf(by),
          now(),
        ),
      );
      keep(root, replace(pieces, moved));
      host.heard?.({ work: moved, from: before.stage, to: moved.stage });
      host.changed("work");
    },
  };
}

// A maker the factory closed on (a restart of the server while it was at
// work) is picked up again when the factory starts: in the same copy, where
// its edits so far wait uncommitted, in the same conversation, asked to
// carry on. So a restart never leaves a prototype that looks dead.
//
// What it was asked is kept beside the copy while it works, and dropped
// once it is done or failed: the file is there only for a maker cut off.

import { readFileSync, rmSync, writeFileSync } from "node:fs";

import type { Board, Exploration, KobbleStore } from "@software-factory/core";

import { versionCopy } from "../../prototypes/copies.ts";
import type { Made } from "./versions.ts";

type Asked = { change: string | null };

function fileOf(project: string, exploration: string, made: Made): string {
  return `${versionCopy(project, exploration, made.key, made.branch).folder}.maker-request`;
}

export function keepAsked(
  project: string,
  exploration: string,
  made: Made,
  change: string | undefined,
): void {
  try {
    const asked: Asked = { change: change ?? null };
    writeFileSync(fileOf(project, exploration, made), JSON.stringify(asked));
  } catch {
    // Not kept: picked up after a restart, it is made again from the start.
  }
}

export function dropAsked(
  project: string,
  exploration: string,
  made: Made,
): void {
  rmSync(fileOf(project, exploration, made), { force: true });
}

// What a cut-off maker was asked; a first making when nothing was kept.
function askedOf(
  project: string,
  exploration: string,
  made: Made,
): string | undefined {
  try {
    const read = JSON.parse(
      readFileSync(fileOf(project, exploration, made), "utf8"),
    ) as Partial<Asked>;
    return typeof read.change === "string" ? read.change : undefined;
  } catch {
    return undefined;
  }
}

// The prototypes of the open explorations marked as being made that no
// maker is on now.
function cutOff(
  explorations: Exploration[],
  boardOf: (id: string) => Board,
  making: (exploration: string, key: string) => boolean,
): { exploration: Exploration; made: Made }[] {
  return explorations
    .filter((one) => one.status === "waiting" || one.status === "exploring")
    .flatMap((exploration) =>
      boardOf(exploration.id).things.flatMap((thing) =>
        thing.kind === "prototype" &&
        thing.making &&
        !making(exploration.id, thing.key)
          ? [{ exploration, made: thing }]
          : [],
      ),
    );
}

// What each maker the factory closed on is asked again: its exploration,
// board, prototype and the change it was making (none: a first making).
// None before there is a factory, or when the records cannot be read: the
// factory starts all the same.
export function cutOffAsks(
  on: { store: () => KobbleStore; project: string },
  making: (exploration: string, key: string) => boolean,
): {
  exploration: Exploration;
  board: Board;
  key: string;
  change: string | undefined;
}[] {
  try {
    const store = on.store();
    return cutOff(
      store.all("explorations"),
      (id) => store.board(id),
      making,
    ).map(({ exploration, made }) => ({
      exploration,
      board: store.board(exploration.id),
      key: made.key,
      change: askedOf(on.project, exploration.id, made),
    }));
  } catch {
    return [];
  }
}

// Said first to a maker picked up again.
export const CARRY_ON =
  "The factory restarted while you were making this prototype, so you were stopped. What you did so far is in this copy, not committed yet: look at it first (git status, git diff), keep what is right, and carry on from there.";

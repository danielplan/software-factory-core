// The prototypes on a board that were never made: not being made now, and
// their branch is neither on this computer nor on origin (their copy could
// not be made). There is nothing in them for the builder to start from, so
// a hand-off leaves them out (actions.ts) and the Hand off button does not
// wait for them to be agreed.

import type { Board } from "@software-factory/core";

import { git } from "../../prototypes/copies.ts";

function hasBranch(project: string, branch: string): boolean {
  return [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`].some(
    (ref) => {
      try {
        git(project, ["rev-parse", "--verify", "--quiet", ref]);
        return true;
      } catch {
        return false;
      }
    },
  );
}

export function unmadeIn(project: string, board: Board): string[] {
  return board.things.flatMap((thing) =>
    thing.kind === "prototype" &&
    !thing.making &&
    !hasBranch(project, thing.branch)
      ? [thing.key]
      : [],
  );
}

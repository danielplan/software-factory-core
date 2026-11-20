// What making a version gave: committed and pushed (so a teammate opens it
// too; the board says when it could not be), shown on the board as ready or
// stopped, and told to the kobold who talks with the team.

import type { Claude, Workspace } from "@software-factory/core";

import type { PrototypeMode } from "../../prototypes/mode.ts";
import { commitWords, notShared, stopped } from "./making-words.ts";
import type { Made } from "./versions.ts";

// A prototype the maker finished: its name, its thing on the board, what
// the maker said it did, and the files it changed.
export type MadeReport = {
  name: string;
  thing: string;
  said: string;
  files: string;
};

export type Ready =
  ((exploration: string, key: string, made: MadeReport) => void) | null;

export async function finishMaking(on: {
  mode: PrototypeMode;
  workspace: Workspace;
  exploration: string;
  made: Made;
  change: string | undefined;
  result: Awaited<ReturnType<Claude["run"]>>;
  ready: Ready;
}): Promise<void> {
  const { mode, workspace, exploration, made, change, result } = on;
  await workspace.commitAll(
    commitWords(exploration, made, change, result.ok ? result.text : ""),
  );
  const unshared = notShared(await workspace.pushBranch(made.branch));
  mode.set(
    exploration,
    made.key,
    result.ok
      ? { state: "stopped", activity: null, problem: unshared }
      : {
          state: "failed",
          activity: null,
          problem: stopped(result.error, made.branch, unshared),
        },
  );
  if (result.ok)
    on.ready?.(exploration, made.key, {
      name: change
        ? `changed from ${made.from ?? "before"}: ${change}`
        : made.name,
      thing: made.id,
      said: result.text.trim().slice(0, 3000),
      files: (await workspace.changes()).slice(0, 2000),
    });
}

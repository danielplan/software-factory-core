// A branch can be checked out in one working copy at a time. A card's branch
// is also where its prototype lives while planning, and a prototype copy that
// is still there would stop the builder from using the branch. Detaching that
// copy at the commit it is on frees the branch and changes no file, so what
// is running there carries on.

import { existsSync, realpathSync } from "node:fs";

import { run } from "../processes.ts";

export async function freeBranch(
  copy: string,
  branch: string,
  keep: string,
): Promise<void> {
  const list = await run("git", [
    "-C",
    copy,
    "worktree",
    "list",
    "--porcelain",
  ]);
  for (const entry of list.split(/\r?\n\r?\n/)) {
    const path = /^worktree (.+)$/m.exec(entry)?.[1];
    const holds = entry.split(/\r?\n/).includes(`branch refs/heads/${branch}`);
    if (
      path &&
      holds &&
      existsSync(path) &&
      realpathSync(path) !== realpathSync(keep)
    )
      await run("git", ["-C", path, "checkout", "--quiet", "--detach"]);
  }
}

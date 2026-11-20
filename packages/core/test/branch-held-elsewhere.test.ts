import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { run, Workspace } from "../src/index.ts";

async function repository() {
  const folder = realpathSync(mkdtempSync(join(tmpdir(), "held-")));
  const origin = join(folder, "origin.git");
  const source = join(folder, "source");
  await git("init", "--quiet", "--bare", "-b", "main", origin);
  await git("clone", "--quiet", origin, source);
  writeFileSync(join(source, "README.md"), "An app");
  await git("-C", source, "add", ".");
  await commit(source, "x");
  await git("-C", source, "push", "--quiet", "origin", "HEAD:main");
  return { folder, source };
}

const git = (...args: string[]) => run("git", args);
const commit = (copy: string, message: string) =>
  git(
    "-C",
    copy,
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "commit",
    "-qm",
    message,
  );

test("a card's branch open in a copy outside the factory's folders is a person's: never taken, said where", async () => {
  const { folder, source } = await repository();
  // A person's own worktree, beside the project, on the card's branch, with
  // work not committed yet.
  const own = join(folder, "my-work");
  await git(
    "-C",
    source,
    "worktree",
    "add",
    "--quiet",
    "-b",
    "factory/issue-6",
    own,
    "origin/main",
  );
  writeFileSync(join(own, "MINE.md"), "by hand");

  const builds = new Workspace(
    {
      source,
      workspaces: join(folder, "copies"),
      baseBranch: "main",
      ownCopies: [join(folder, "prototypes")],
    },
    "builds",
  );
  // Asked before the copy is made, and after.
  assert.equal(await builds.heldElsewhere("factory/issue-6"), own);
  await assert.rejects(
    builds.prepareSharedBranch("factory/issue-6"),
    /factory\/issue-6 is open in .*my-work, which is not one of the factory's copies/,
  );
  assert.equal(await builds.heldElsewhere("factory/issue-6"), own);
  assert.equal(await builds.heldElsewhere("factory/issue-7"), null);
  // The person's copy is left as it was: on its branch, its work there.
  assert.equal(
    (await git("-C", own, "branch", "--show-current")).trim(),
    "factory/issue-6",
  );
  assert.equal(
    (await git("-C", own, "status", "--short")).trim(),
    "?? MINE.md",
  );

  // The owner's own checkout on the branch is a person's too.
  await git("-C", own, "checkout", "--quiet", "--detach");
  await git("-C", source, "checkout", "--quiet", "factory/issue-6");
  assert.equal(await builds.heldElsewhere("factory/issue-6"), source);
});

test("a card's branch held by a prototype copy is freed for the build, the prototype left as it is", async () => {
  const { folder, source } = await repository();

  // The prototype: its own copy of the repository, on the card's branch,
  // with a change that is pushed and a file that is only there.
  const prototype = join(folder, "prototypes", "issue-10");
  mkdirSync(join(folder, "prototypes"));
  await git("-C", source, "fetch", "--quiet", "origin");
  await git(
    "-C",
    source,
    "worktree",
    "add",
    "-b",
    "factory/issue-10",
    prototype,
    "origin/main",
  );
  writeFileSync(join(prototype, "SKETCH.md"), "A sketch");
  await git("-C", prototype, "add", ".");
  await commit(prototype, "p");
  await git(
    "-C",
    prototype,
    "push",
    "--quiet",
    "origin",
    "HEAD:refs/heads/factory/issue-10",
  );
  writeFileSync(join(prototype, "RUNNING.log"), "still here");

  const builds = new Workspace(
    {
      source,
      workspaces: join(folder, "copies"),
      baseBranch: "main",
      ownCopies: [join(folder, "prototypes")],
    },
    "builds",
  );
  assert.equal(await builds.heldElsewhere("factory/issue-10"), null);
  await builds.prepareSharedBranch("factory/issue-10");

  assert.equal(
    (await git("-C", builds.path, "branch", "--show-current")).trim(),
    "factory/issue-10",
  );
  assert.equal(
    (await git("-C", prototype, "branch", "--show-current")).trim(),
    "",
  );
  assert.equal(
    (await git("-C", prototype, "rev-parse", "HEAD")).trim(),
    (await git("-C", builds.path, "rev-parse", "HEAD")).trim(),
  );
  assert.equal(
    (await git("-C", prototype, "status", "--short")).trim(),
    "?? RUNNING.log",
  );
});

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { run, Workspace } from "../src/index.ts";

test("a card's branch held by a prototype copy is freed for the build, the prototype left as it is", async () => {
  const folder = mkdtempSync(join(tmpdir(), "held-"));
  const git = (...args: string[]) => run("git", args);
  const origin = join(folder, "origin.git");
  const source = join(folder, "source");
  await git("init", "--quiet", "--bare", "-b", "main", origin);
  await git("clone", "--quiet", origin, source);
  writeFileSync(join(source, "README.md"), "An app");
  await git("-C", source, "add", ".");
  await git(
    "-C",
    source,
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "commit",
    "-qm",
    "x",
  );
  await git("-C", source, "push", "--quiet", "origin", "HEAD:main");

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
  await git(
    "-C",
    prototype,
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "commit",
    "-qm",
    "p",
  );
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
    { source, workspaces: join(folder, "copies"), baseBranch: "main" },
    "builds",
  );
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

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { GIT } from "@software-factory/knowledge-base";

import { homeOf, removeIdeaCopies } from "../src/prototypes/copies.ts";
import { inGit } from "./git-project.ts";

// An exploration's copies go once it is handed off or dropped; its branches
// stay.

test("an exploration's copies and what was left beside them are removed; its branch stays", () => {
  const project = join(mkdtempSync(join(tmpdir(), "copies-")), "shop");
  mkdirSync(project);
  writeFileSync(join(project, "README.md"), "Shop\n");
  inGit(project);
  const git = (...args: string[]) =>
    execFileSync(GIT, args, { cwd: project, encoding: "utf8" });
  const copy = join(homeOf(project), "X-1", "a");
  git("worktree", "add", "--quiet", "-b", "proto/X-1-a", copy, "main");
  mkdirSync(join(homeOf(project), "X-1", "a-demo"));
  removeIdeaCopies(project, "X-1");
  assert.equal(existsSync(join(homeOf(project), "X-1")), false);
  assert.match(git("branch", "--list", "proto/X-1-a"), /proto\/X-1-a/);
  assert.doesNotMatch(git("worktree", "list"), /X-1/);
  // Nothing there, or a name that is not one: nothing happens.
  removeIdeaCopies(project, "X-2");
  removeIdeaCopies(project, "../shop");
  assert.ok(existsSync(project));
});

// A project in git for the tests of prototypes: its main branch, a person
// named in its git settings, and an origin (a bare repository beside it)
// that has main, as the working copies expect.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { GIT } from "@software-factory/knowledge-base";

export function git(cwd: string, ...args: string[]): string {
  const ran = spawnSync(GIT, args, { cwd, encoding: "utf8" });
  assert.equal(ran.status, 0, ran.stderr);
  return ran.stdout;
}

// Everything in the folder committed on main and pushed to its origin.
export function inGit(project: string, who = "Pia"): string {
  const origin = join(dirname(project), "origin.git");
  mkdirSync(origin, { recursive: true });
  git(origin, "init", "--quiet", "--bare", "--initial-branch=main");
  git(project, "init", "--quiet", "--initial-branch=main");
  git(project, "config", "user.email", "test@example.com");
  git(project, "config", "user.name", who);
  git(project, "remote", "add", "origin", origin);
  git(project, "add", ".");
  git(project, "commit", "--quiet", "--allow-empty", "-m", "Start");
  git(project, "push", "--quiet", "origin", "main");
  return origin;
}

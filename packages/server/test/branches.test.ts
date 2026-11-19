import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { GIT } from "@software-factory/knowledge-base";

import { commitAndPush, originProblem } from "../src/builder/branches.ts";

// The builder's work goes on the card's branch: a settings file left over
// (an untracked .env.test) is nothing to commit, so the work still goes.

function git(cwd: string, ...args: string[]): string {
  const ran = spawnSync(GIT, args, { cwd, encoding: "utf8" });
  assert.equal(ran.status, 0, ran.stderr);
  return ran.stdout.trim();
}

function copy(): { folder: string; origin: string } {
  const home = mkdtempSync(join(tmpdir(), "branches-"));
  const origin = join(home, "origin.git");
  const folder = join(home, "build");
  mkdirSync(origin);
  git(origin, "init", "-q", "--bare");
  mkdirSync(folder);
  git(folder, "init", "-q");
  git(folder, "config", "user.email", "b@acme.test");
  git(folder, "config", "user.name", "Builder");
  git(folder, "remote", "add", "origin", origin);
  writeFileSync(join(folder, "app.ts"), "export const a = 1;\n");
  git(folder, "add", ".");
  git(folder, "commit", "-q", "-m", "Work done earlier");
  return { folder, origin };
}

test("only a settings file left over: nothing is committed, the branch is still pushed", async () => {
  const { folder, origin } = copy();
  mkdirSync(join(folder, "kit"));
  writeFileSync(join(folder, "kit", ".env.test"), "SECRET=1\n");
  const before = git(folder, "rev-parse", "HEAD");

  await commitAndPush(folder, "factory/issue-10", "Build #10");

  assert.equal(git(folder, "rev-parse", "HEAD"), before);
  assert.equal(git(origin, "rev-parse", "factory/issue-10"), before);
});

test("work left uncommitted is committed without the settings file and pushed", async () => {
  const { folder, origin } = copy();
  writeFileSync(join(folder, "app.ts"), "export const a = 2;\n");
  writeFileSync(join(folder, ".env.test"), "SECRET=1\n");

  await commitAndPush(folder, "factory/issue-10", "Build #10");

  assert.equal(
    git(origin, "log", "-1", "--format=%s", "factory/issue-10"),
    "Build #10",
  );
  assert.equal(
    git(folder, "show", "--name-only", "--format=", "HEAD"),
    "app.ts",
  );
});

test("origin must be the board's repository on GitHub, or the work never reaches the board", async () => {
  const { folder } = copy();
  assert.match(
    (await originProblem(folder, "acme/shop")) ?? "",
    /pushes to `.*origin\.git`, not to acme\/shop on GitHub/,
  );
  git(folder, "remote", "set-url", "origin", "git@github.com:Acme/Shop.git");
  assert.equal(await originProblem(folder, "acme/shop"), null);
  git(folder, "remote", "set-url", "origin", "https://github.com/acme/shop");
  assert.equal(await originProblem(folder, "acme/shop"), null);
  git(
    folder,
    "remote",
    "set-url",
    "origin",
    "https://github.com/acme/blog.git",
  );
  assert.match((await originProblem(folder, "acme/shop")) ?? "", /acme\/blog/);
});

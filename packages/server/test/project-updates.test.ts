import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { chooseUpdatesByItself, updatesByItself } from "@software-factory/core";

import { ProjectUpdates } from "../src/updates/project-updates.ts";

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("/usr/bin/git", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
}

// A pretend GitHub (a bare repository), the owner's folder cloned from it,
// and a second clone where new work is merged and sent to GitHub.
function world() {
  const base = mkdtempSync(join(tmpdir(), "project-updates-"));
  made.push(base);
  const github = join(base, "github.git");
  const folder = join(base, "folder");
  const elsewhere = join(base, "elsewhere");
  git(base, "init", "--quiet", "--bare", "--initial-branch=main", github);
  git(base, "clone", "--quiet", github, elsewhere);
  for (const cwd of [elsewhere]) {
    git(cwd, "config", "user.email", "test@example.com");
    git(cwd, "config", "user.name", "Test");
  }
  writeFileSync(join(elsewhere, "readme.md"), "one\n");
  git(elsewhere, "add", ".");
  git(elsewhere, "commit", "--quiet", "-m", "First version");
  git(elsewhere, "push", "--quiet", "origin", "main");
  git(base, "clone", "--quiet", github, folder);
  git(folder, "config", "user.email", "test@example.com");
  git(folder, "config", "user.name", "Test");
  const merge = (file: string, title: string) => {
    git(elsewhere, "switch", "--quiet", "-c", "work");
    writeFileSync(join(elsewhere, file), `${title}\n`);
    git(elsewhere, "add", ".");
    git(elsewhere, "commit", "--quiet", "-m", "Work in progress");
    git(elsewhere, "switch", "--quiet", "main");
    git(
      elsewhere,
      "merge",
      "--quiet",
      "--no-ff",
      "-m",
      `Merge pull request #7 from acme/work\n\n${title}`,
      "work",
    );
    git(elsewhere, "branch", "--quiet", "-D", "work");
    git(elsewhere, "push", "--quiet", "origin", "main");
  };
  return { base, folder, merge };
}

test("it sees what is new on GitHub, by its pull request title, without changing the folder", async () => {
  const { folder, merge } = world();
  merge("notes.md", "CALL: fuel below the threshold");
  const updates = new ProjectUpdates({ root: folder });
  await updates.look();
  const { waiting, blocked, offline, lastLookAt } = updates.state;
  assert.deepEqual(waiting, {
    count: 1,
    titles: ["CALL: fuel below the threshold"],
  });
  assert.equal(blocked, null);
  assert.equal(offline, false);
  assert.ok(lastLookAt);
  assert.equal(existsSync(join(folder, "notes.md")), false);
});

test("an update moves the folder forward and says how many changes came", async () => {
  const { folder, merge } = world();
  merge("notes.md", "Notes");
  const updates = new ProjectUpdates({ root: folder });
  const seen: boolean[] = [];
  updates.subscribe((state) => seen.push(state.updating));
  assert.deepEqual(await updates.update(), { kind: "updated", count: 1 });
  assert.equal(readFileSync(join(folder, "notes.md"), "utf8").trim(), "Notes");
  assert.equal(updates.state.waiting.count, 0);
  assert.equal(updates.state.lastUpdate?.count, 1);
  assert.deepEqual(seen.slice(0, 1), [true]);
  assert.equal(updates.state.updating, false);
  assert.deepEqual(await updates.update(), { kind: "current" });
});

test("files changed by hand stop the update and are named", async () => {
  const { folder, merge } = world();
  merge("notes.md", "Notes");
  writeFileSync(join(folder, "readme.md"), "changed by hand\n");
  const updates = new ProjectUpdates({ root: folder });
  const outcome = await updates.update();
  assert.equal(outcome.kind, "not-updated");
  assert.deepEqual(updates.state.blocked?.files, ["readme.md"]);
  assert.match(updates.state.blocked.reason, /changed by hand/);
  assert.equal(existsSync(join(folder, "notes.md")), false);
});

test("another branch, or saved changes of its own, stop the update", async () => {
  const { folder, merge } = world();
  merge("notes.md", "Notes");
  git(folder, "switch", "--quiet", "-c", "trying");
  const updates = new ProjectUpdates({ root: folder });
  await updates.update();
  assert.match(updates.state.blocked?.reason ?? "", /branch "trying"/);
  git(folder, "switch", "--quiet", "main");
  writeFileSync(join(folder, "notes.md"), "mine\n");
  git(folder, "add", ".");
  git(folder, "commit", "--quiet", "-m", "Mine");
  await updates.update();
  assert.match(updates.state.blocked?.reason ?? "", /1 saved change/);
});

test("a file git does not keep, in the new version's way, stops the update and is named", async () => {
  const { folder, merge } = world();
  merge("notes.md", "Notes");
  writeFileSync(join(folder, "notes.md"), "mine\n");
  const updates = new ProjectUpdates({ root: folder });
  const outcome = await updates.update();
  assert.equal(outcome.kind, "not-updated");
  assert.deepEqual(updates.state.blocked?.files, ["notes.md"]);
  assert.equal(readFileSync(join(folder, "notes.md"), "utf8"), "mine\n");
});

test("without GitHub it says so and changes nothing", async () => {
  const { folder, base } = world();
  git(folder, "remote", "set-url", "origin", join(base, "gone.git"));
  const updates = new ProjectUpdates({ root: folder });
  assert.deepEqual(await updates.update(), {
    kind: "not-updated",
    reason: "GitHub could not be reached",
  });
  assert.equal(updates.state.offline, true);
});

test("the Update by itself switch is kept as a setting, and switching it on updates", async () => {
  const { folder, base, merge } = world();
  merge("notes.md", "Notes");
  const root = join(base, "factory");
  mkdirSync(root);
  const choice = {
    read: () => updatesByItself(root),
    write: (on: boolean) => {
      chooseUpdatesByItself(root, on);
    },
  };
  const updates = new ProjectUpdates({ root: folder, choice });
  assert.equal(updates.state.byItself, false);
  updates.chooseByItself(true);
  assert.equal(
    new ProjectUpdates({ root: folder, choice }).state.byItself,
    true,
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  while (updates.state.updating)
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(existsSync(join(folder, "notes.md")), true);
});

test("following looks again and again, and updates only with the switch on", async () => {
  const { folder, merge } = world();
  merge("notes.md", "Notes");
  const updates = new ProjectUpdates({ root: folder });
  const stop = updates.follow(10);
  while (updates.state.lastLookAt === null)
    await new Promise((resolve) => setTimeout(resolve, 20));
  stop();
  while (updates.state.looking)
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(updates.state.waiting.count, 1);
  assert.equal(existsSync(join(folder, "notes.md")), false);
});

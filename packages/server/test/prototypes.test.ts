import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { GIT } from "@software-factory/knowledge-base";

import { prototypeCommand } from "../src/prototypes/command.ts";

// A card's prototype: its own copy of the project on the card's branch, and
// the project's own commands run in it.

function git(cwd: string, ...args: string[]): string {
  return execFileSync(GIT, args, { cwd, encoding: "utf8" });
}

// A project with a factory (and a git history), inside a folder of its own
// so its prototypes land inside the test's folder.
function projectWith(prototype?: object): string {
  const parent = mkdtempSync(join(tmpdir(), "proto-"));
  const project = join(parent, "shop");
  mkdirSync(join(project, "factory"), { recursive: true });
  writeFileSync(
    join(project, "factory", "factory.json"),
    JSON.stringify({ name: "Shop", prototype }),
  );
  git(project, "init", "--quiet", "--initial-branch=main");
  git(project, "config", "user.email", "test@example.com");
  git(project, "config", "user.name", "Test");
  writeFileSync(join(project, "README.md"), "Shop\n");
  git(project, "add", ".");
  git(project, "commit", "--quiet", "-m", "Start");
  return project;
}

async function said(args: string[], from: string) {
  const lines: string[] = [];
  const code = await prototypeCommand(
    args,
    from,
    (l) => lines.push(l),
    "ignore",
  );
  return { code, said: lines.join("\n") };
}

test("starting makes the card's copy on its branch and runs the project's start command there", async () => {
  const project = projectWith({
    start: `sh -c 'echo "$FACTORY_CARD|$FACTORY_BRANCH|$0|$1" > started.txt'`,
  });
  const copy = join(project, "..", "shop-prototypes", "issue-7");
  const first = await said(["7", "--business", "bakery shop"], project);
  assert.equal(first.code, 0);
  assert.match(first.said, /A new branch factory\/issue-7 from main/);
  assert.equal(
    readFileSync(join(copy, "started.txt"), "utf8").trim(),
    "7|factory/issue-7|--business|bakery shop",
  );
  assert.equal(git(copy, "branch", "--show-current").trim(), "factory/issue-7");
  // The owner's own folder and branch were not touched.
  assert.equal(git(project, "branch", "--show-current").trim(), "main");
  assert.equal(existsSync(join(project, "started.txt")), false);
  // Again: the same copy, and the command runs again.
  const again = await said(["#7"], project);
  assert.equal(again.code, 0);
  assert.doesNotMatch(again.said, /A new branch/);
});

test("an existing branch of the card is copied, not started again", async () => {
  const project = projectWith({ start: "true" });
  git(project, "branch", "factory/issue-3");
  const { said: text } = await said(["3"], project);
  assert.match(text, /Copying the branch factory\/issue-3/);
});

test("without a start command in factory.json the copy is made and the owner is told", async () => {
  const project = projectWith();
  const { code, said: text } = await said(["4"], project);
  assert.equal(code, 0);
  assert.match(text, /Nothing starts in it/);
  assert.ok(existsSync(join(project, "..", "shop-prototypes", "issue-4")));
});

test("stop and remove run the project's commands; remove deletes the copy and keeps the branch", async () => {
  const project = projectWith({
    start: "true",
    stop: 'echo stopped > "$FACTORY_PROJECT/../stopped.txt"',
    remove: 'echo removed > "$FACTORY_PROJECT/../removed.txt"',
  });
  const parent = join(project, "..");
  await said(["5"], project);
  assert.equal((await said(["5", "--stop"], project)).code, 0);
  assert.ok(existsSync(join(parent, "stopped.txt")));
  assert.equal(existsSync(join(parent, "removed.txt")), false);
  const removed = await said(["5", "--remove"], project);
  assert.match(removed.said, /Removed card #5's copy/);
  assert.ok(existsSync(join(parent, "removed.txt")));
  assert.equal(existsSync(join(parent, "shop-prototypes", "issue-5")), false);
  assert.match(git(project, "branch", "--list", "factory/issue-5"), /issue-5/);
  assert.match(
    (await said(["5", "--remove"], project)).said,
    /no prototype copy/,
  );
});

test("list names each copy; a project command that fails fails the command", async () => {
  const project = projectWith({ start: "exit 3" });
  assert.equal((await said(["list"], project)).said, "No prototypes.");
  assert.equal((await said(["6"], project)).code, 3);
  assert.match(
    (await said(["list"], project)).said,
    /^#6 {2}factory\/issue-6 /,
  );
});

test("a wrong card number, no factory and no words are said plainly", async () => {
  const project = projectWith({ start: "true" });
  const wrong = await said(["soon"], project);
  assert.equal(wrong.code, 1);
  assert.match(wrong.said, /“soon” is not a card number/);
  assert.equal((await said([], project)).code, 0);
  const none = await said(["1"], mkdtempSync(join(tmpdir(), "bare-")));
  assert.equal(none.code, 1);
  assert.match(none.said, /There is no factory here/);
});

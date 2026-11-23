import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { GIT } from "@software-factory/knowledge-base";

import type { Cli } from "../src/github-cli.ts";
import { planOf, stageNamed, withPlan } from "../src/cards/cards.ts";
import { cardCommand } from "../src/cards/command.ts";
import { githubCards } from "../src/extensions/github/cards.ts";
import { githubAddOn } from "../src/extensions/github/index.ts";
import { slotFillers } from "../src/plugs/extension.ts";
import { BOARD, pretendGitHub } from "./pretend-github.ts";

// The board's cards for the coding agents: listed, shown, moved, made, and
// given the plan the owner agreed to, which moves them to ready for the
// runner. GitHub is a stand-in that remembers what it was told.

// A project with its factory on the stand-in board, and an origin (a bare
// repository here) that has the branch factory/issue-3.
function project(tracker = "github"): string {
  const home = mkdtempSync(join(tmpdir(), "cards-"));
  const origin = join(home, "origin.git");
  const folder = join(home, "shop");
  const git = (cwd: string, ...args: string[]) => {
    const ran = spawnSync(GIT, args, { cwd, encoding: "utf8" });
    assert.equal(ran.status, 0, ran.stderr);
  };
  mkdirSync(origin);
  git(origin, "init", "-q", "--bare");
  mkdirSync(join(folder, "factory"), { recursive: true });
  git(folder, "init", "-q");
  git(folder, "config", "user.email", "o@acme.test");
  git(folder, "config", "user.name", "Owner");
  git(folder, "remote", "add", "origin", origin);
  writeFileSync(
    join(folder, "factory", "factory.json"),
    JSON.stringify({ name: "Acme", tracker }),
  );
  writeFileSync(
    join(folder, "factory", "board.json"),
    JSON.stringify({
      github: BOARD,
    }),
  );
  git(folder, "add", ".");
  git(folder, "commit", "-q", "-m", "Factory");
  git(folder, "push", "-q", "origin", "HEAD:refs/heads/factory/issue-3");
  return folder;
}

async function card(folder: string, cli: Cli, ...args: string[]) {
  const lines: string[] = [];
  const boards = slotFillers([githubAddOn(cli)]).tasks;
  const code = await cardCommand(args, boards, folder, cli, (line) =>
    lines.push(line),
  );
  return { code, said: lines.join("\n") };
}

test("the agreed plan sits in the card between its marks, replaced when agreed again", () => {
  const once = withPlan("The request.", "Do A.");
  assert.equal(planOf(once), "## The agreed plan\n\nDo A.");
  const twice = withPlan(once, "Do B.");
  assert.equal(planOf(twice), "## The agreed plan\n\nDo B.");
  assert.ok(twice.startsWith("The request."));
  assert.equal(planOf("No plan here."), null);
  assert.equal(planOf(withPlan("", "Only.")), "## The agreed plan\n\nOnly.");
  assert.equal(stageNamed("Ready"), "todo");
  assert.equal(stageNamed("in progress"), "doing");
  assert.equal(stageNamed("later"), null);
});

test("a coding agent plans a card with the owner and puts it in ready, with its prototype", async () => {
  const github = pretendGitHub();
  const folder = project();
  const list = await card(folder, github.cli, "list");
  assert.equal(
    list.said,
    "#3  Backlog  Invoices in euros  https://github.com/acme/shop/issues/3",
  );
  assert.match(
    (await card(folder, github.cli, "move", "3", "planning")).said,
    /“planning” is not a stage/,
  );
  assert.equal(
    (await card(folder, github.cli, "move", "3", "doing")).said,
    "Moved #3 to In progress.",
  );
  assert.equal(github.issues.get(3)?.column, "In progress");
  const shown = await card(folder, github.cli, "show", "#3");
  assert.match(shown.said, /In progress {2}Invoices in euros/);
  assert.match(
    shown.said,
    /No agreed plan yet\.\n\nAs written\.\n\n— ana:\nEuros only\?/,
  );
  await card(folder, github.cli, "comment", "3", "--body", "Yes, euros only.");
  assert.deepEqual(github.said, ["#3: Yes, euros only."]);

  const plan = join(folder, "plan.md");
  writeFileSync(plan, "Show totals in euros.\n");
  // The prototype must be on the repository first.
  const unpushed = await card(
    folder,
    github.cli,
    "agree",
    "3",
    "--plan-file",
    plan,
    "--prototype",
    "factory/issue-30",
  );
  assert.equal(unpushed.code, 1);
  assert.match(unpushed.said, /not on the repository yet: push it/);
  const agreed = await card(
    folder,
    github.cli,
    "agree",
    "3",
    "--plan-file",
    plan,
    "--prototype",
    "factory/issue-3",
  );
  assert.equal(agreed.code, 0);
  assert.match(agreed.said, /#3 has its agreed plan and is ready/);
  assert.equal(github.issues.get(3)?.column, "Ready");
  const body = github.issues.get(3)?.body ?? "";
  assert.match(
    planOf(body) ?? "",
    /Show totals in euros\.\n\n\*\*Prototype:\*\* branch `factory\/issue-3`, to build on\.\n\*\*Agreed by:\*\* octo, \d{4}-\d\d-\d\d\./,
  );
  assert.match(
    (await card(folder, github.cli, "show", "3")).said,
    /Has an agreed plan\./,
  );
  assert.match(
    (await card(folder, github.cli, "list", "ready")).said,
    /^#3 {2}Ready/,
  );
});

test("a new card lands in the backlog; mistakes are said plainly", async () => {
  const github = pretendGitHub();
  const folder = project();
  assert.match(
    (await card(folder, github.cli, "new", "Export", "to", "CSV")).said,
    /^#9 {2}Backlog {2}Export to CSV/,
  );
  const said = async (...args: string[]) =>
    (await card(folder, github.cli, ...args)).said;
  assert.match(await said("help"), /software-factory card list/);
  assert.match(await said("fly"), /no card command “fly”/);
  assert.match(await said("show", "x"), /Give the card's number/);
  assert.match(await said("show", "77"), /no card #77/);
  assert.match(await said("move", "3", "later"), /not a stage/);
  assert.match(await said("new"), /Give the card a title/);
  assert.match(await said("agree", "3"), /--plan-file/);
  assert.match(
    (await card(project("none"), github.cli, "list")).said,
    /No board is connected yet/,
  );
  assert.match(
    (await card(mkdtempSync(join(tmpdir(), "none-")), github.cli, "list")).said,
    /no factory here/,
  );
});

test("a new card lands in its column on a board that adds new issues by itself", async () => {
  const github = pretendGitHub({ addsNewIssues: true });
  assert.match(
    (await card(project(), github.cli, "new", "Export", "to", "CSV")).said,
    /^#9 {2}Backlog {2}Export to CSV/,
  );
});

test("cards depend on and replace each other; something noticed becomes a card that links back", async () => {
  const github = pretendGitHub();
  const folder = project();
  github.issues.set(4, {
    title: "Totals per month",
    body: "",
    column: "Ready",
  });
  const said = async (...args: string[]) =>
    (await card(folder, github.cli, ...args)).said;

  assert.equal(
    await said("depends", "4", "--on", "3"),
    "#4 now depends on #3: it is built after it.",
  );
  assert.match(
    await said("list"),
    /#4 {2}Ready {2}Totals per month {2}\(waits for #3\)/,
  );
  assert.match(await said("show", "4"), /Depends on: #3 Invoices in euros/);
  assert.match(await said("show", "3"), /Needed by: #4 Totals per month/);
  assert.match(
    await said("depends", "4", "--on", "4"),
    /can't depend on itself/,
  );

  // Something noticed while working on #3 becomes its own card, linked both ways.
  assert.match(
    await said("new", "Rounding", "is", "off", "--found-while", "3"),
    /^#9 {2}Backlog {2}Rounding is off/,
  );
  assert.ok(github.said.includes("#3: Noticed while working on this: #9."));

  // #3 is replaced by #4: closed, with a note on both, and #4 no longer waits.
  assert.equal(
    await said("replace", "3", "--by", "4"),
    "#3 is closed: #4 does it now. Both say so.",
  );
  assert.ok(github.closed.has(3));
  assert.ok(github.said.includes("#3: Replaced by #4, which does this now."));
  assert.ok(github.said.includes("#4: Replaces #3."));
  assert.doesNotMatch(await said("list"), /waits for/);
  assert.match(
    await said("show", "4"),
    /Depends on: #3 Invoices in euros \(done\)/,
  );
});

test("a card not wanted any more is deleted: closed as not planned and off the board, not while it is being built", async () => {
  const github = pretendGitHub();
  github.issues.set(4, {
    title: "Totals per month",
    body: "",
    column: "In progress",
  });
  const cards = githubCards(github.cli, BOARD);

  await cards.remove?.(3);
  assert.ok(github.closed.has(3));
  assert.ok(github.removed.has(3));
  assert.ok(!(await cards.list()).some((one) => one.number === 3));

  await assert.rejects(
    cards.remove?.(4) ?? Promise.resolve(),
    /builder is on #4/,
  );
  assert.ok(!github.closed.has(4));
  await assert.rejects(cards.remove?.(3) ?? Promise.resolve(), /no card #3/);
});

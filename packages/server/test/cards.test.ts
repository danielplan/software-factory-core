import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { GIT } from "@software-factory/knowledge-base";

import type { Cli } from "../src/add-ons/github/github.ts";
import { planOf, stageNamed, withPlan } from "../src/cards/cards.ts";
import { cardCommand } from "../src/cards/command.ts";

// The board's cards for the coding agents: listed, shown, moved, made, and
// given the plan the owner agreed to, which moves them to ready for the
// runner. GitHub is a stand-in that remembers what it was told.

const STAGES = {
  backlog: "Backlog",
  planning: "Planning",
  todo: "Ready",
  doing: "In progress",
  review: "In review",
  done: "Done",
};
const OPTIONS = Object.values(STAGES).map((name, n) => ({
  id: `o${String(n)}`,
  name,
  color: "GRAY",
  description: "",
}));

function pretendGitHub() {
  const issues = new Map([
    [3, { title: "Invoices in euros", body: "As written.", column: "Backlog" }],
  ]);
  const said: string[] = [];
  const says = (out: unknown) =>
    Promise.resolve({
      code: 0,
      out: typeof out === "string" ? out : JSON.stringify(out),
      err: "",
    });
  const items = () => [
    ...[...issues].map(([number, issue]) => ({
      id: `item-${String(number)}`,
      fieldValueByName: { name: issue.column },
      content: {
        number,
        title: issue.title,
        url: `https://github.com/acme/shop/issues/${String(number)}`,
        repository: { nameWithOwner: "acme/shop" },
        labels: { nodes: [] },
      },
    })),
    // Another repository's issue and a draft are not the factory's cards.
    {
      id: "item-x",
      fieldValueByName: { name: "Backlog" },
      content: {
        number: 1,
        title: "Elsewhere",
        url: "",
        repository: { nameWithOwner: "acme/blog" },
        labels: { nodes: [] },
      },
    },
    { id: "item-d", fieldValueByName: null, content: null },
  ];
  // The board through GitHub's API: its items, its Status field, a move.
  const api = (query: string) => {
    if (query.includes("updateProjectV2ItemFieldValue")) {
      const item = /itemId: "item-(\d+)"/.exec(query)?.[1];
      const option = /singleSelectOptionId: "(o\d)"/.exec(query)?.[1];
      const moved = issues.get(Number(item));
      const to = OPTIONS.find((o) => o.id === option);
      if (moved && to) moved.column = to.name;
      return says({ data: {} });
    }
    const project = query.includes("items(")
      ? { id: "P1", items: { nodes: items() } }
      : { field: { id: "F1", options: OPTIONS } };
    return says({ data: { repositoryOwner: { projectV2: project } } });
  };
  // An issue: read, edited, commented on, made.
  const issue = (args: string[]) => {
    const [, verb, number] = args;
    const found = issues.get(Number(number));
    const value = (flag: string) => args[args.indexOf(flag) + 1] ?? "";
    if (verb === "view" && found)
      return says({
        body: found.body,
        comments: [{ author: { login: "ana" }, body: "Euros only?" }],
      });
    if (verb === "edit" && found) found.body = value("--body");
    if (verb === "comment") said.push(value("--body"));
    if (verb === "create") {
      issues.set(9, { title: value("--title"), body: "", column: "" });
      return says("https://github.com/acme/shop/issues/9\n");
    }
    return says("");
  };
  const run = (args: string[]) => {
    const [first, second] = args;
    if (first === "api" && second === "user") return says("octo\n");
    if (first === "api") return api(args[3] ?? "");
    if (first === "issue") return issue(args);
    if (first === "project" && second === "item-add") return says("{}");
    return Promise.resolve({
      code: 1,
      out: "",
      err: `not known: ${args.join(" ")}`,
    });
  };
  const cli: Cli = {
    run,
    start: () => ({ answer: () => {}, done: Promise.resolve(1) }),
  };
  return { cli, issues, said };
}

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
      github: { repository: "acme/shop", board: 2, label: "*", stages: STAGES },
    }),
  );
  git(folder, "add", ".");
  git(folder, "commit", "-q", "-m", "Factory");
  git(folder, "push", "-q", "origin", "HEAD:refs/heads/factory/issue-3");
  return folder;
}

async function card(folder: string, cli: Cli, ...args: string[]) {
  const lines: string[] = [];
  const code = await cardCommand(args, folder, cli, (line) => lines.push(line));
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
  assert.equal(
    (await card(folder, github.cli, "move", "3", "planning")).said,
    "Moved #3 to Planning.",
  );
  assert.equal(github.issues.get(3)?.column, "Planning");
  const shown = await card(folder, github.cli, "show", "#3");
  assert.match(shown.said, /Planning {2}Invoices in euros/);
  assert.match(
    shown.said,
    /No agreed plan yet\.\n\nAs written\.\n\n— ana:\nEuros only\?/,
  );
  await card(folder, github.cli, "comment", "3", "--body", "Yes, euros only.");
  assert.deepEqual(github.said, ["Yes, euros only."]);

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
    /^#3 {2}To do/,
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
    /factory's own board: connect a GitHub board/,
  );
  assert.match(
    (await card(mkdtempSync(join(tmpdir(), "none-")), github.cli, "list")).said,
    /no factory here/,
  );
});

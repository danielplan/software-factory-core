import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { GIT } from "@software-factory/knowledge-base";

import { githubSetup } from "../src/add-ons/github/board-setup.ts";
import type { Cli } from "../src/add-ons/github/github.ts";

// Setting up the GitHub board with the owner in setup: what the coach hears
// before it plans, and connecting or making the board while it builds. The
// GitHub CLI is a stand-in that knows one owner's boards.

function project(remote: string | null): string {
  const folder = mkdtempSync(join(tmpdir(), "board-"));
  spawnSync(GIT, ["init", "-q"], { cwd: folder });
  if (remote)
    spawnSync(GIT, ["remote", "add", "origin", remote], { cwd: folder });
  return folder;
}

const START = [
  { id: "o1", name: "Todo", color: "GREEN", description: "" },
  { id: "o2", name: "In Progress", color: "YELLOW", description: "" },
  { id: "o3", name: "Done", color: "PURPLE", description: "" },
];

function pretendGitHub(): Cli & { asked: string[] } {
  const asked: string[] = [];
  const says = (out: unknown) =>
    Promise.resolve({ code: 0, out: JSON.stringify(out), err: "" });
  const status = { id: "F1", options: START };
  return {
    asked,
    run: (args) => {
      const line = args.join(" ");
      asked.push(line);
      if (line === "project list --owner acme --format json")
        return says({
          projects: [{ number: 1, title: "Roadmap", items: { totalCount: 3 } }],
        });
      if (line.startsWith("project create --owner acme --title Acme work"))
        return says({ number: 7 });
      if (line === "project link 7 --owner acme --repo acme/shop")
        return says({});
      if (line.includes("updateProjectV2Field"))
        return says({
          data: {
            updateProjectV2Field: {
              projectV2Field: {
                options: [
                  ...START,
                  ...["Backlog", "Planning", "Review"].map((name, n) => ({
                    id: `n${String(n)}`,
                    name,
                    color: "GRAY",
                    description: "",
                  })),
                ],
              },
            },
          },
        });
      if (line.includes("repositoryOwner"))
        return says({
          data: { repositoryOwner: { projectV2: { field: status } } },
        });
      return Promise.resolve({ code: 1, out: "", err: "not known" });
    },
    start: () => ({ answer: () => {}, done: Promise.resolve(1) }),
  };
}

test("the coach hears where the code is on GitHub and the boards there", async () => {
  const cli = pretendGitHub();
  const facts = await githubSetup(cli).facts(
    project("git@github.com:acme/shop.git"),
  );
  assert.equal(
    facts,
    "On GitHub: the code is at acme/shop. The boards of acme:\n" +
      "- “Roadmap” (board 1): 3 cards; columns Todo, In Progress, Done",
  );
  assert.equal(
    await githubSetup(cli).facts(project("https://gitlab.com/acme/shop")),
    "",
  );
  assert.equal(await githubSetup(cli).facts(project(null)), "");
});

test("a board that is there is connected as it is, saying which stages have no column", async () => {
  const cli = pretendGitHub();
  const { entry, said } = await githubSetup(cli).connect(
    project("https://github.com/acme/shop.git"),
    { board: 1 },
  );
  assert.deepEqual(entry, {
    repository: "acme/shop",
    board: 1,
    label: "factory",
    stages: {
      backlog: "",
      planning: "",
      todo: "Todo",
      doing: "In Progress",
      review: "",
      done: "Done",
    },
  });
  assert.match(said, /No column for Backlog, Planning, Review/);
  assert.ok(!cli.asked.some((line) => line.includes("updateProjectV2Field")));
});

test("a new board is made, linked to the code, and gets the stages' columns beside its own", async () => {
  const cli = pretendGitHub();
  const { entry, said } = await githubSetup(cli).connect(
    project("git@github.com:acme/shop.git"),
    { create: "Acme work", label: "*" },
  );
  assert.equal(entry.board, 7);
  assert.equal(entry.label, "*");
  assert.deepEqual(entry.stages, {
    backlog: "Backlog",
    planning: "Planning",
    todo: "Todo",
    doing: "In Progress",
    review: "Review",
    done: "Done",
  });
  assert.match(
    said,
    /^Made and connected board 7 of acme, linked to acme\/shop/,
  );
  const update = cli.asked.find((line) =>
    line.includes("updateProjectV2Field"),
  );
  // The columns there keep their ids and colours; each new one goes in its
  // stage's place.
  assert.match(update ?? "", /\{id: "o1", name: "Todo", color: GREEN/);
  const names = [...(update ?? "").matchAll(/name: "([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(names, [
    "Backlog",
    "Planning",
    "Todo",
    "In Progress",
    "Review",
    "Done",
  ]);
  assert.match(
    update ?? "",
    /name: "Planning", color: PURPLE, description: "Its plan is talked through\."/,
  );
});

test("connecting refuses what cannot be done, in plain words", async () => {
  const cli = pretendGitHub();
  await assert.rejects(
    githubSetup(cli).connect(project(null), { board: 1 }),
    /not on GitHub/,
  );
  await assert.rejects(
    githubSetup(cli).connect(project("git@github.com:acme/shop.git"), {}),
    /Name the board/,
  );
  await assert.rejects(
    githubSetup(cli).connect(project("git@github.com:acme/shop.git"), {
      board: 2,
      label: "no way!",
    }),
    /cannot be a label/,
  );
});

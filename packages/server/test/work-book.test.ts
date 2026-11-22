import assert from "node:assert/strict";
import { test } from "node:test";

import { keptIn, type Moved } from "@software-factory/core";

import type { Cards } from "../src/cards/cards.ts";
import { githubCards } from "../src/extensions/github/cards.ts";
import { workRoutes } from "../src/work-book.ts";
import { BOARD, pretendGitHub } from "./pretend-github.ts";

// A card is the piece of work: its stage is its board column's (Build, then
// Done) or the team's stage that holds it, and the moves are kept on the card.

const url = new URL("http://localhost/");
const course = [
  { id: "signals", checks: [] },
  { id: "build", checks: [] },
  { id: "checklist", checks: [{ id: "ticked", name: "every item is ticked" }] },
  { id: "done", checks: [] },
  { id: "release", checks: [] },
];

function bookOf(stages = course) {
  const github = pretendGitHub();
  github.issues.set(4, {
    title: "Totals",
    body: "Asked.",
    column: "In progress",
  });
  const cards = githubCards(github.cli, BOARD);
  const told: string[] = [];
  const heard: Moved[] = [];
  const routes = workRoutes({
    cards: () => cards,
    course: () => stages,
    kobbles: () => ["signals", "build", "done", "release"],
    heard: (moved) => heard.push(moved),
    changed: (what) => told.push(what),
    now: () => "2026-11-22T10:00:00Z",
  });
  const call = async (name: string, body?: unknown) => {
    const route = routes[name];
    assert.ok(route, name);
    return (await route(body, url)) as Record<string, unknown>;
  };
  return { github, cards, told, heard, call };
}

test("every card is a piece of work with a stage from where it sits, and nothing is kept on it yet", async () => {
  const { github, call } = bookOf();
  github.issues.set(5, { title: "Old", body: "", column: "Done" });
  const { pieces } = (await call("GET /api/work-pieces")) as {
    pieces: { id: string; stage: string; history: unknown[] }[];
  };
  assert.deepEqual(
    pieces.map((piece) => [piece.id, piece.stage, piece.history.length]),
    [
      ["3", "build", 0],
      ["4", "build", 0],
      ["5", "done", 0],
    ],
  );
  assert.equal(github.issues.get(4)?.body, "Asked.");
});

test("a card moves into a team's stage, which is a label and a note kept in its text", async () => {
  const { github, call, told } = bookOf();
  await call("POST /api/work-pieces/move", {
    number: 4,
    to: "checklist",
    by: "ada",
  });
  assert.deepEqual(github.labels.get(4), ["stage: checklist"]);
  assert.ok(github.made.has("stage: checklist"));
  const body = github.issues.get(4)?.body ?? "";
  assert.ok(body.startsWith("Asked."));
  assert.deepEqual(
    keptIn(body)?.history.map((move) => [move.from, move.to, move.by]),
    [["build", "checklist", "ada"]],
  );
  // The board's column is not touched by a team's stage.
  assert.equal(github.issues.get(4)?.column, "In progress");
  assert.deepEqual(told, ["work"]);
  const { pieces } = (await call("GET /api/work-pieces")) as {
    pieces: { id: string; stage: string; open: { id: string }[] }[];
  };
  const mine = pieces.find((piece) => piece.id === "4");
  assert.ok(mine);
  assert.equal(mine.stage, "checklist");
  assert.deepEqual(
    mine.open.map((check) => check.id),
    ["ticked"],
  );
});

test("a card leaves a team's stage only when its checks pass, and listeners hear each move", async () => {
  const { github, call, heard } = bookOf();
  await call("POST /api/work-pieces/move", { number: 4, to: "checklist" });
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { number: 4, to: "done" }),
    /Not yet: every item is ticked/,
  );
  await assert.rejects(
    () => call("POST /api/work-pieces/check", { number: 4, check: "other" }),
    /asks for no check/,
  );
  await call("POST /api/work-pieces/check", { number: 4, check: "ticked" });
  assert.deepEqual(keptIn(github.issues.get(4)?.body ?? "")?.passed, [
    "ticked",
  ]);
  await call("POST /api/work-pieces/move", { number: 4, to: "done" });
  // Done is the board's: the column follows, the team's stage lets go.
  assert.equal(github.issues.get(4)?.column, "Done");
  assert.deepEqual(github.labels.get(4), []);
  assert.deepEqual(
    heard.map((one) => [one.work.id, one.from, one.to]),
    [
      ["4", "build", "checklist"],
      ["4", "checklist", "done"],
    ],
  );
  assert.deepEqual(
    keptIn(github.issues.get(4)?.body ?? "")?.history.map((move) => move.to),
    ["checklist", "done"],
  );
});

test("a card sent back needs no checks; one in Done goes back to review", async () => {
  const { github, call } = bookOf();
  await call("POST /api/work-pieces/move", { number: 4, to: "checklist" });
  await call("POST /api/work-pieces/move", { number: 4, to: "build" });
  assert.deepEqual(github.labels.get(4), []);
  assert.equal(keptIn(github.issues.get(4)?.body ?? "")?.stage, "build");
  github.issues.set(5, { title: "Old", body: "", column: "Done" });
  await call("POST /api/work-pieces/move", { number: 5, to: "checklist" });
  assert.equal(github.issues.get(5)?.column, "In review");
  assert.deepEqual(github.labels.get(5), ["stage: checklist"]);
});

test("Kobble's own stages hold no card, and a closed card does not move", async () => {
  const { github, call } = bookOf();
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { number: 4, to: "release" }),
    /There is no stage "release"/,
  );
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { number: 4, to: "signals" }),
    /There is no stage "signals"/,
  );
  github.closed.add(4);
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { number: 4, to: "checklist" }),
    /is closed/,
  );
});

test("a card whose team's stage is gone is in Build again; the order must have Build before Done", async () => {
  const { github, call } = bookOf();
  github.labels.set(4, ["stage: gone"]);
  const { pieces } = (await call("GET /api/work-pieces")) as {
    pieces: { id: string; stage: string }[];
  };
  assert.equal(pieces.find((piece) => piece.id === "4")?.stage, "build");
  const backwards = bookOf([
    { id: "done", checks: [] },
    { id: "build", checks: [] },
  ]);
  await assert.rejects(
    () => backwards.call("GET /api/work-pieces"),
    /Build has to come before Done/,
  );
});

test("something that is not asked right, or a card that is not there, is refused", async () => {
  const { call } = bookOf();
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { number: "x", to: "done" }),
    /number of the card/,
  );
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { number: 4, to: " " }),
    /Say the stage/,
  );
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { number: 99, to: "done" }),
    /no card #99/,
  );
  await assert.rejects(
    () => call("POST /api/work-pieces/check", { number: 4 }),
    /Say the check/,
  );
});

test("a board that cannot keep a piece of work says so", async () => {
  const github = pretendGitHub();
  const plain: Cards = githubCards(github.cli, BOARD);
  delete plain.keepWork;
  const routes = workRoutes({
    cards: () => plain,
    course: () => course,
    kobbles: () => [],
    changed: () => {},
  });
  await assert.rejects(
    async () =>
      routes["POST /api/work-pieces/move"]?.(
        { number: 3, to: "checklist" },
        url,
      ),
    /cannot keep/,
  );
});

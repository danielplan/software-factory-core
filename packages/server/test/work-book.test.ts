import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { Moved, Work } from "@software-factory/core";

import { countByStage, readWork, workRoutes } from "../src/work-book.ts";

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

const url = new URL("http://localhost/");
const course = [
  { id: "build", checks: [] },
  { id: "checklist", checks: [{ id: "ticked", name: "every item is ticked" }] },
  { id: "done", checks: [] },
];

function bookIn() {
  const project = mkdtempSync(join(tmpdir(), "work-book-"));
  made.push(project);
  const told: string[] = [];
  const heard: Moved[] = [];
  const routes = workRoutes({
    project,
    course: () => course,
    heard: (moved) => heard.push(moved),
    changed: (what) => told.push(what),
    now: () => "2026-11-22T10:00:00Z",
  });
  const call = async (name: string, body?: unknown) => {
    const route = routes[name];
    assert.ok(route, name);
    return (await route(body, url)) as Record<string, unknown>;
  };
  return { project, told, heard, call };
}

test("work is started in the first stage and kept in the factory's files", async () => {
  const { project, told, call } = bookIn();
  const { id } = await call("POST /api/work-pieces", { title: " A page " });
  const [piece] = readWork(join(project, "factory"));
  assert.ok(piece);
  assert.equal(piece.id, id);
  assert.equal(piece.title, "A page");
  assert.equal(piece.stage, "build");
  assert.deepEqual(told, ["work"]);
});

test("work moves on only when the checks pass, and listeners hear the move", async () => {
  const { project, heard, call } = bookIn();
  const { id } = await call("POST /api/work-pieces", { title: "A page" });
  await call("POST /api/work-pieces/move", { id, to: "checklist", by: "ada" });
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { id, to: "done" }),
    /Not yet: every item is ticked/,
  );
  await call("POST /api/work-pieces/check", { id, check: "ticked" });
  await call("POST /api/work-pieces/move", { id, to: "done" });
  assert.deepEqual(
    heard.map((one) => [one.from, one.to]),
    [
      ["build", "checklist"],
      ["checklist", "done"],
    ],
  );
  const [piece] = readWork(join(project, "factory"));
  assert.deepEqual(
    piece?.history.map((move) => [move.from, move.to, move.by]),
    [
      [null, "build", "team"],
      ["build", "checklist", "ada"],
      ["checklist", "done", "team"],
    ],
  );
});

test("the list says which checks are still open", async () => {
  const { call } = bookIn();
  const { id } = await call("POST /api/work-pieces", { title: "A page" });
  await call("POST /api/work-pieces/move", { id, to: "checklist" });
  const { pieces } = (await call("GET /api/work-pieces")) as {
    pieces: { open: { id: string }[] }[];
  };
  assert.deepEqual(
    pieces[0]?.open.map((check) => check.id),
    ["ticked"],
  );
});

test("something that is not asked right, or a piece that is not there, is refused", async () => {
  const { call } = bookIn();
  await assert.rejects(
    () => call("POST /api/work-pieces", { title: " " }),
    /Say what/,
  );
  await assert.rejects(
    () => call("POST /api/work-pieces/move", { id: "nope", to: "done" }),
    /no such piece/,
  );
});

test("a file that is not a book of work is read as none, and pieces are counted by stage", () => {
  const project = mkdtempSync(join(tmpdir(), "work-book-"));
  made.push(project);
  const root = join(project, "factory");
  mkdirSync(root);
  writeFileSync(join(root, "work.json"), "{ not json");
  assert.deepEqual(readWork(root), []);
  writeFileSync(join(root, "work.json"), '{"pieces":[{"id":1}]}');
  assert.deepEqual(readWork(root), []);
  const piece = (stage: string): Work => ({
    id: stage,
    title: "t",
    stage,
    passed: [],
    history: [],
    parts: {},
  });
  assert.deepEqual(
    countByStage([piece("build"), piece("build"), piece("done")]),
    { build: 2, done: 1 },
  );
});

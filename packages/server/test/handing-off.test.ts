import assert from "node:assert/strict";
import { test } from "node:test";

import type { KobbleStore } from "@software-factory/core";

import type { CardView, WorkView } from "../src/api.ts";
import { HandOffs } from "../src/extensions/explorations/handing-off.ts";
import { MakerDesk } from "../src/extensions/explorations/maker-desk.ts";
import { factoryView } from "../src/extensions/factory/factory-view.ts";
import { plugsOf } from "./plugs.ts";

// What the team sees while work is under way: a hand-off's stages and the
// spec writer's steps; a clash with main only as a problem in Review; and a
// maker that goes on in its prototype's conversation after a restart.

test("a hand-off shows its stage and steps while it runs, once at a time, and nothing after", async () => {
  let changes = 0;
  const handOffs = new HandOffs(() => {
    changes++;
  });
  const seen: string[] = [];
  const done = await handOffs.run("X-1", async ({ stage, step }) => {
    assert.equal(handOffs.of("X-1")?.stage, "spec");
    for (let n = 0; n < 45; n++) step(`Thinking ${String(n)}`);
    stage("card");
    const now = handOffs.of("X-1");
    seen.push(now?.stage ?? "", String(now?.steps.length), now?.steps[0] ?? "");
    await assert.rejects(
      handOffs.run("X-1", () => Promise.resolve(0)),
      /being handed off already/,
    );
    stage("prototypes");
    return 7;
  });
  assert.equal(done, 7);
  assert.deepEqual(seen, ["card", "40", "Thinking 5"]);
  assert.equal(handOffs.of("X-1"), null);
  assert.ok(changes > 45);
  await assert.rejects(
    handOffs.run("X-2", () => Promise.reject(new Error("no board"))),
    /no board/,
  );
  assert.equal(handOffs.of("X-2"), null);
});

test("a clash with main asks for Resolve in Review; back in To do or Building the builder is on it", () => {
  const store = {
    all: () => [],
    board: () => ({ things: [] }),
  } as unknown as KobbleStore;
  const card = (number: number, stage: CardView["stage"]): CardView => ({
    number,
    title: `Card ${String(number)}`,
    stage,
    column: "",
    url: "",
    pullRequest: "https://example.test/pr",
    pullRequestState: "open",
    conflict: true,
    closed: false,
    asks: false,
  });
  const work = {
    cards: [card(1, "review"), card(2, "todo"), card(3, "doing")],
  } as unknown as WorkView;
  const cards = factoryView(work, plugsOf(store)).columns.flatMap((column) =>
    column.cards.map((one) => [one.number, one.conflict, one.resolving]),
  );
  assert.deepEqual(
    cards.toSorted((a, b) => Number(a[0]) - Number(b[0])),
    [
      [1, true, false],
      [2, false, true],
      [3, false, true],
    ],
  );
});

test("a maker goes on in the conversation saved with its prototype, and hands it back when done", () => {
  const desk = new MakerDesk();
  assert.deepEqual(desk.sessionFor("X-1", "A", "saved-1"), {
    id: "saved-1",
    resume: true,
  });
  assert.equal(desk.done("X-1", "A"), "saved-1");
  assert.equal(desk.done("X-1", "B"), null);
  const fresh = desk.sessionFor("X-1", "B", null);
  assert.equal(fresh.resume, false);
  assert.equal(desk.done("X-1", "B"), fresh.id);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import type { AddOnView } from "../src/api.ts";
import {
  hide,
  layoutFrom,
  moveBefore,
  nudge,
  offeredOf,
  placeAt,
  shownOf,
  START,
} from "../src/lib/home-layout.ts";

function addOn(id: string, blocks: string[], on = true): AddOnView {
  return {
    id,
    name: id,
    about: "",
    builtIn: true,
    on,
    tracker: false,
    always: false,
    needs: [],
    slots: [],
    brings: { pages: [], blocks, kobolds: [], stages: [] },
    settings: [],
  };
}

const addOns = [
  addOn("factory", ["status", "waiting", "loop", "reviews"]),
  addOn("explorations", ["exploring"]),
  addOn("signals", ["signals"], false),
];
const offered = offeredOf(addOns);

test("only the blocks of installed extensions are offered", () => {
  assert.deepEqual(
    [...offered].sort((a, b) => a.localeCompare(b)),
    ["exploring", "loop", "reviews", "status", "waiting"],
  );
});

test("nobody arranged Home: it shows what it showed before it could be arranged", () => {
  const layout = layoutFrom(null, addOns);
  assert.deepEqual(shownOf(layout, offered), ["status", "waiting", "loop"]);
});

test("a block an extension brings later is off Home, at the end, until it is added", () => {
  const kept = { order: ["loop", "status"], hidden: ["status"] };
  const layout = layoutFrom(kept, [...addOns, addOn("standup", ["standup"])]);
  assert.deepEqual(layout.order.slice(0, 2), ["loop", "status"]);
  assert.equal(layout.order.at(-1), "standup");
  assert.ok(layout.hidden.includes("standup"));
  assert.ok(layout.hidden.includes("waiting"));
  assert.deepEqual(
    shownOf(layout, offered),
    ["loop"],
    "the team's choice is kept: only the loop is on Home",
  );
});

test("a removed extension's block leaves Home and returns in its place", () => {
  const kept = { order: ["status", "signals", "loop"], hidden: [] };
  const layout = layoutFrom(kept, addOns);
  assert.deepEqual(shownOf(layout, offered).slice(0, 2), ["status", "loop"]);
  const back = offeredOf(addOns.map((one) => ({ ...one, on: true })));
  assert.deepEqual(shownOf(layout, back).slice(0, 3), [
    "status",
    "signals",
    "loop",
  ]);
});

test("a block dropped on another goes before it; on itself nothing moves", () => {
  assert.deepEqual(moveBefore(["a", "b", "c"], "c", "a"), ["c", "a", "b"]);
  assert.deepEqual(moveBefore(["a", "b", "c"], "a", "c"), ["b", "a", "c"]);
  assert.deepEqual(moveBefore(["a", "b", "c"], "b", "b"), ["a", "b", "c"]);
});

test("moving a block up or down swaps it with the next one shown, not a hidden one", () => {
  const layout = layoutFrom(
    { order: ["status", "exploring", "waiting"], hidden: ["exploring"] },
    addOns,
  );
  assert.deepEqual(nudge(layout, "status", 1, offered).order.slice(0, 3), [
    "waiting",
    "exploring",
    "status",
  ]);
  assert.equal(nudge(layout, "status", -1, offered), layout);
});

test("hiding keeps the block's place, and adding it puts it where it was dropped", () => {
  const layout = hide(START, "loop");
  assert.deepEqual(layout.order, START.order);
  assert.deepEqual(shownOf(layout, offered), ["status", "waiting"]);
  const placed = placeAt(layout, "loop", 0, offered);
  assert.deepEqual(shownOf(placed, offered), ["loop", "status", "waiting"]);
  const last = placeAt(layout, "reviews", 99, offered);
  assert.deepEqual(shownOf(last, offered), ["status", "waiting", "reviews"]);
  assert.equal(hide(layout, "loop"), layout, "hiding twice changes nothing");
});

test("placing a block on an empty Home puts it first", () => {
  const empty = { order: ["status"], hidden: ["status"] };
  const placed = placeAt(empty, "status", 0, offered);
  assert.deepEqual(shownOf(placed, offered), ["status"]);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { aroundPlaced, GAP } from "../src/lib/around-placed.ts";

// A box a person placed stays; the laid-out ones keep their column and
// order there, and move down where a placed box is.

const box = (id: string, height = 100) => ({ id, width: 200, height });
const at = (x: number, y: number) => ({ x, y });

test("a box laid out under a placed one moves down in its column", () => {
  const boxes = [box("a"), box("b"), box("p")];
  const laidOut = new Map([
    ["a", at(0, 0)],
    ["b", at(0, 140)],
    ["p", at(280, 0)],
  ]);
  // The person put p over a.
  const places = aroundPlaced(boxes, laidOut, new Map([["p", at(20, 30)]]));
  assert.deepEqual(places.get("p"), at(20, 30));
  assert.deepEqual(places.get("a"), at(0, 30 + 100 + GAP));
  // b stays under a, in the same column.
  assert.deepEqual(places.get("b"), at(0, 30 + 100 + GAP + 100 + GAP));
});

test("boxes clear of every placed box stay where the layout put them", () => {
  const boxes = [box("a"), box("b"), box("p")];
  const laidOut = new Map([
    ["a", at(0, 0)],
    ["b", at(280, 0)],
    ["p", at(560, 0)],
  ]);
  const places = aroundPlaced(boxes, laidOut, new Map([["p", at(900, 400)]]));
  assert.deepEqual(places.get("a"), at(0, 0));
  assert.deepEqual(places.get("b"), at(280, 0));
});

test("a box moves past every placed box in its way, not only the first", () => {
  const boxes = [box("a"), box("p"), box("q")];
  const laidOut = new Map([
    ["a", at(0, 0)],
    ["p", at(280, 0)],
    ["q", at(560, 0)],
  ]);
  const places = aroundPlaced(
    boxes,
    laidOut,
    new Map([
      ["p", at(0, 0)],
      ["q", at(50, 100 + GAP + 10)],
    ]),
  );
  assert.deepEqual(places.get("a"), at(0, 100 + GAP + 10 + 100 + GAP));
});

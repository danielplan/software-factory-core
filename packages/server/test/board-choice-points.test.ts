import assert from "node:assert/strict";
import { test } from "node:test";

import type { Board, Thing } from "@software-factory/core";

import { thingSchema } from "../../core/src/kobble/schemas.ts";
import { applyAct } from "../src/extensions/explorations/board-acts.ts";

// A choice's trade-offs: the points its options are compared on, a cell per
// option by its letter, shown side by side on the card.

const empty = { things: [], links: [] } as unknown as Board;
type Choice = Extract<Thing, { kind: "choice" }>;

function choiceOn(board: Board): Choice {
  const thing = board.things.find((one) => one.kind === "choice");
  assert.ok(thing?.kind === "choice");
  return thing;
}

function withChoice(): Board {
  return applyAct(
    empty,
    {
      act: "choice",
      title: "Where do orders live?",
      options: [
        { name: "Shared database", difference: "One place for all apps" },
        { name: "Its own", difference: "Kept apart" },
      ],
      points: [
        { label: " Cost ", cells: { a: "Free", B: "€5 a month " } },
        { label: "Work", cells: { A: "A day", B: "A week" } },
      ],
    },
    "kobold",
  ).board;
}

test("a choice keeps its trade-offs: a row per point, each option's cell by its letter", () => {
  const choice = choiceOn(withChoice());
  assert.deepEqual(choice.points, [
    { label: "Cost", cells: { A: "Free", B: "€5 a month" } },
    { label: "Work", cells: { A: "A day", B: "A week" } },
  ]);
  assert.ok(thingSchema.safeParse(choice).success);
});

test("a choice without points has none, as before", () => {
  const board = applyAct(
    empty,
    {
      act: "choice",
      title: "Colour?",
      options: [{ name: "Blue" }, { name: "Red" }],
    },
    "kobold",
  ).board;
  assert.equal("points" in choiceOn(board), false);
});

test("a cell for an option the choice does not have, a point without a label, or more than six are refused", () => {
  const option = [{ name: "One" }, { name: "Two" }];
  const tryPoints = (
    points: { label: string; cells: Record<string, string> }[],
  ) =>
    applyAct(
      empty,
      { act: "choice", title: "Which?", options: option, points },
      "kobold",
    );
  assert.throws(
    () => tryPoints([{ label: "Cost", cells: { C: "?" } }]),
    /no option C/,
  );
  assert.throws(() => tryPoints([{ label: " ", cells: {} }]), /needs a label/);
  assert.throws(
    () =>
      tryPoints(
        Array.from({ length: 7 }, (_, i) => ({
          label: `P${String(i)}`,
          cells: {},
        })),
      ),
    /at most 6 points/,
  );
});

test("changing the table replaces it, [] takes it off, and an option taken off takes its cells", () => {
  const board = withChoice();
  const id = choiceOn(board).id;
  const replaced = applyAct(
    board,
    { act: "change", id, points: [{ label: "Risk", cells: { B: "Low" } }] },
    "kobold",
  ).board;
  assert.deepEqual(choiceOn(replaced).points, [
    { label: "Risk", cells: { B: "Low" } },
  ]);

  const fewer = applyAct(
    board,
    { act: "change", id, removeOptions: ["B"] },
    "kobold",
  ).board;
  assert.deepEqual(choiceOn(fewer).points, [
    { label: "Cost", cells: { A: "Free" } },
    { label: "Work", cells: { A: "A day" } },
  ]);

  const off = applyAct(
    board,
    { act: "change", id, points: [] },
    "kobold",
  ).board;
  assert.equal("points" in choiceOn(off), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Board } from "@software-factory/core";

import { applyAct } from "../src/kobble/explorations/board-acts.ts";

// The kobold adds a thing and its arrow in one step.

const board = {
  things: [
    {
      agreed: false,
      place: null,
      by: "kobold" as const,
      id: "problem",
      kind: "note" as const,
      text: "People forget their basket.",
    },
  ],
  links: [],
} as unknown as Board;

test("a new note comes with its arrow from the thing it follows", () => {
  const done = applyAct(
    board,
    { act: "note", text: "They pay later.", from: "problem", label: "so" },
    "kobold",
  );
  const added = done.board.things.at(-1);
  assert.ok(added);
  assert.deepEqual(
    done.board.links.map((link) => [link.from, link.to, link.label]),
    [["problem", added.id, "so"]],
  );
  assert.match(done.said, /linked from problem/);
});

test("without from, or from a thing that is not there, it is added alone", () => {
  assert.equal(
    applyAct(board, { act: "note", text: "Alone." }, "kobold").board.links
      .length,
    0,
  );
  const missing = applyAct(
    board,
    { act: "note", text: "Lost.", from: "nothing" },
    "kobold",
  );
  assert.equal(missing.board.links.length, 0);
  assert.equal(missing.board.things.length, 2);
  assert.match(missing.said, /no nothing to link it from/);
});

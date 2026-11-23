import assert from "node:assert/strict";
import { test } from "node:test";

import { applyAct } from "../src/extensions/explorations/board-acts.ts";
import { explorationsFactory } from "./explorations-factory.ts";

// A prototype the team does not want built (a broken first version, say)
// can be taken off the board, so it no longer stands in the way of what
// they agreed; the agreed one stays until the agreement is taken back.

const fresh = { agreed: false, place: null, by: "kobold" as const };
const board = {
  things: [
    {
      ...fresh,
      id: "choice-1",
      kind: "choice" as const,
      title: "Which?",
      options: [{ key: "A", name: "One", difference: "x" }],
      chosen: null,
    },
    {
      ...fresh,
      id: "prototype-a",
      kind: "prototype" as const,
      key: "A",
      name: "One",
      difference: "x",
      branch: "proto/X-1-a",
      tests: [],
    },
  ],
  links: [{ id: "link-1", from: "choice-1", to: "prototype-a", label: "" }],
};

test("a prototype nobody agreed on is taken off with its arrows; an agreed one stays", () => {
  const agreed = applyAct(
    board,
    { act: "agree", id: "prototype-a", agreed: true },
    "kobold",
  ).board;
  assert.throws(
    () => applyAct(agreed, { act: "remove", id: "prototype-a" }, "kobold"),
    /Prototype A is agreed: mark it a sketch first/,
  );
  const without = applyAct(
    board,
    { act: "remove", id: "prototype-a" },
    "kobold",
  ).board;
  assert.deepEqual(
    without.things.map((one) => one.id),
    ["choice-1"],
  );
  assert.deepEqual(without.links, []);
});

test("the kobold takes prototypes off the board once the team says so, after the agreement is taken back", async () => {
  const factory = await explorationsFactory([
    {
      calls: [
        ["remove_thing", { id: "prototype-a" }],
        ["remove_thing", { id: "prototype-b" }],
        ["agree", { id: "prototype-b", agreed: false }],
        ["remove_thing", { id: "prototype-b" }],
      ],
      reply: "Both are off the board.",
    },
  ]);
  try {
    await factory.press("/say", { id: "X-1", text: "Drop both, please." });
    const page = await factory.settled("X-1");
    assert.deepEqual(
      page.board.things.filter((one) => one.kind === "prototype"),
      [],
    );
    // The agreed one was refused first, with what to do.
    assert.match(
      factory.answers.flat().join("\n"),
      /Prototype B is agreed: mark it a sketch first/,
    );
  } finally {
    factory.close();
  }
});

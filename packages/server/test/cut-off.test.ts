import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { test } from "node:test";

import {
  CARRY_ON,
  cutOffAsks,
  dropAsked,
  keepAsked,
} from "../src/extensions/explorations/cut-off.ts";
import { askFor } from "../src/extensions/explorations/making-words.ts";
import { homeOf } from "../src/prototypes/copies.ts";
import {
  markedIn,
  prototypeOf,
} from "../src/extensions/explorations/versions.ts";
import { explorationsFactory } from "./explorations-factory.ts";

test("a maker the factory closed on is asked again what it was making", async () => {
  const factory = await explorationsFactory();
  try {
    const { store, project } = factory;
    const board = store.board("X-1");
    const marked = markedIn(board, "A", { making: true });
    assert.ok(marked);
    store.saveBoard("X-1", marked);
    const made = prototypeOf(marked, "A");
    assert.ok(made);
    mkdirSync(`${homeOf(project)}/X-1`, { recursive: true });
    keepAsked(project, "X-1", made, "Put the tabs on top");
    const on = { store: () => store, project };

    // No maker on it now: picked up, with the change it was making.
    const asks = cutOffAsks(on, () => false);
    assert.deepEqual(
      asks.map((one) => [one.exploration.id, one.key, one.change]),
      [["X-1", "A", "Put the tabs on top"]],
    );
    // A maker still on it: left alone.
    assert.deepEqual(
      cutOffAsks(on, () => true),
      [],
    );
    // Done or failed, what it was asked is dropped: a first making again.
    dropAsked(project, "X-1", made);
    assert.equal(cutOffAsks(on, () => false)[0]?.change, undefined);
  } finally {
    factory.close();
  }
});

test("a maker picked up again is told to carry on from its edits", async () => {
  const factory = await explorationsFactory();
  try {
    const exploration = factory.store.get("explorations", "X-1");
    const board = factory.store.board("X-1");
    const made = prototypeOf(board, "A");
    assert.ok(exploration && made);
    const resumed = askFor(exploration, board, made, {
      change: undefined,
      resumed: true,
      maps: "",
    });
    assert.ok(resumed.startsWith(CARRY_ON));
    assert.match(resumed, /Make prototype A/);
    const fresh = askFor(exploration, board, made, {
      change: undefined,
      maps: "",
    });
    assert.ok(!fresh.includes(CARRY_ON));
  } finally {
    factory.close();
  }
});

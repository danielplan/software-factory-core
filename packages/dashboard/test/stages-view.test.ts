import assert from "node:assert/strict";
import { test } from "node:test";

import { messagesIn } from "../src/i18n/messages.ts";
import {
  moveStage,
  settle,
  stageName,
} from "../src/features/settings/stages-view.ts";

test("a stage moves a place earlier or later, and stays at the ends", () => {
  const order = ["a", "b", "c"];
  assert.deepEqual(moveStage(order, "b", -1), ["b", "a", "c"]);
  assert.deepEqual(moveStage(order, "b", 1), ["a", "c", "b"]);
  assert.deepEqual(moveStage(order, "a", -1), order);
  assert.deepEqual(moveStage(order, "c", 1), order);
  assert.deepEqual(moveStage(order, "x", 1), order);
});

test("a clash is answered by putting one of the two first", () => {
  const order = ["build", "verify", "approve", "done"];
  assert.deepEqual(settle(order, "verify", "approve"), order);
  assert.deepEqual(settle(order, "approve", "verify"), [
    "build",
    "approve",
    "verify",
    "done",
  ]);
});

test("Kobble's stages are named in the words, a team's own by themselves", () => {
  const words = messagesIn("it").market.stages;
  assert.equal(stageName(words, { id: "build", name: "Factory" }), "Fabbrica");
  assert.equal(stageName(words, { id: "check", name: "Check" }), "Check");
  assert.equal(stageName(words, { id: "constructor", name: "Mine" }), "Mine");
});

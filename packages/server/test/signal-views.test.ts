import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import { readSeed, SEED_FILE } from "@software-factory/core";

import { signalView } from "../src/records/signal-views.ts";

// Before a person chooses what to do with something people said, it says
// what already exists for its problem: the ideas and the tickets for it.

const seed = readSeed(
  join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "examples",
    "acme",
    "factory",
    SEED_FILE,
  ),
);
const existing = (id: string, records = seed) =>
  signalView(records, id).existing;

test("a signal shows the ideas and tickets that already exist for its problem", () => {
  assert.deepEqual(
    existing("s1").ideas.map((idea) => idea.id),
    ["wish", "remind"],
  );
  assert.deepEqual(existing("s1").tickets, []);
  assert.deepEqual(existing("s6").tickets, [
    { issue: 138, idea: "tracking", worked: null },
  ]);
  assert.deepEqual(existing("s12").tickets, [
    { issue: 127, idea: "later", worked: "yes" },
  ]);
  assert.deepEqual(existing("s14"), { ideas: [], tickets: [] });
});

test("through its story, or nothing for a signal about no problem", () => {
  const story = seed.stories.find((one) => one.problem === "find");
  assert.ok(story);
  const inStory = {
    ...seed,
    signals: seed.signals.map((one) =>
      one.id === "s1"
        ? { ...one, wentTo: { to: "story" as const, id: story.id } }
        : one,
    ),
  };
  assert.equal(existing("s1", inStory).ideas.length, 2);
  const answered = {
    ...seed,
    signals: seed.signals.map((one) =>
      one.id === "s1" ? { ...one, wentTo: { to: "answered" as const } } : one,
    ),
  };
  assert.deepEqual(existing("s1", answered), { ideas: [], tickets: [] });
});

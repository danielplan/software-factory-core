import assert from "node:assert/strict";
import { test } from "node:test";

import { ticketStage } from "../src/build/view.ts";
import {
  closedWords,
  ideaSteps,
  problemSteps,
  ticketSteps,
} from "../src/lib/stages.ts";

// One stage vocabulary for Understand, Explore and Build: the steps, the
// current one, its name and colour.

test("a problem's pipeline: Heard (or Assumed) to Solved, or Didn't work", () => {
  assert.deepEqual(problemSteps("heard"), {
    names: ["Heard", "Trying ideas", "Building", "In the app", "Solved"],
    at: 0,
    name: "Heard",
    tone: "neutral",
  });
  assert.equal(problemSteps("assumed").names[0], "Assumed");
  assert.deepEqual(
    (["trying", "building", "inApp", "solved"] as const).map((stage) => {
      const { at, tone } = problemSteps(stage);
      return [at, tone];
    }),
    [
      [1, "amber"],
      [2, "amber"],
      [3, "blue"],
      [4, "green"],
    ],
  );
  const failed = problemSteps("didntWork");
  assert.deepEqual(
    [failed.at, failed.names[4], failed.tone],
    [4, "Didn't work", "pink"],
  );
});

test("an idea's pipeline: Idea to Worked, and a ticket's part of it", () => {
  assert.deepEqual(ideaSteps("picked"), {
    names: ["Idea", "Versions", "Picked", "Building", "In the app", "Worked"],
    at: 2,
    name: "Picked",
    tone: "amber",
  });
  assert.equal(ideaSteps("idea").tone, "neutral");
  assert.equal(ideaSteps("versions").at, 1);
  assert.equal(ideaSteps("didntWork").names[5], "Didn't work");
  assert.deepEqual(ticketSteps("inApp"), {
    names: ["Building", "In the app", "Worked"],
    at: 1,
    name: "In the app",
    tone: "blue",
  });
  assert.equal(ticketSteps("building").at, 0);
  assert.deepEqual(ticketSteps("worked").at, 2);
  assert.equal(ticketSteps("idea").at, 0);
});

test("who closed it and when, or just what happened", () => {
  assert.equal(
    closedWords({ by: "Luca", on: "14 Nov" }, "it worked"),
    "Closed by Luca on 14 Nov: it worked",
  );
  assert.equal(closedWords(null, "it didn't work"), "It didn't work");
});

test("a ticket on Build is building, in the app once closed or done, then worked or not", () => {
  const card = (closed: boolean, stage: "todo" | "done" | null = "todo") => ({
    closed,
    stage,
  });
  const answered = (worked: "yes" | "no" | "unchecked") => ({
    outcome: { worked, by: "Pia", on: "16 Nov" },
  });
  assert.equal(ticketStage(card(false), { outcome: null }), "building");
  assert.equal(ticketStage(card(true), { outcome: null }), "inApp");
  assert.equal(ticketStage(card(false, "done"), { outcome: null }), "inApp");
  assert.equal(ticketStage(card(false), answered("unchecked")), "inApp");
  assert.equal(ticketStage(card(true), answered("yes")), "worked");
  assert.equal(ticketStage(card(true), answered("no")), "didntWork");
});

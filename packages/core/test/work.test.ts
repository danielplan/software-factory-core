import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addPart,
  courseOf,
  defineExtension,
  moveWork,
  openChecks,
  passCheck,
  startWork,
  type Work,
} from "../src/index.ts";

// The piece of work: a stage, a history, and moving on only when the stage's
// checks have passed.

const course = [
  { id: "build", checks: [] },
  {
    id: "checklist",
    checks: [
      { id: "ticked", name: "every item is ticked off" },
      { id: "seen", name: "a person has looked" },
    ],
  },
  { id: "done", checks: [] },
];

const started = (): Work => {
  const out = startWork("w1", "A page", course, "ada", "2026-11-22T10:00:00Z");
  assert.ok("work" in out);
  return out.work;
};

const moved = (work: Work, to: string, at = "2026-11-22T11:00:00Z") => {
  const out = moveWork(work, to, course, "ada", at);
  assert.ok("work" in out, "refused" in out ? out.refused : "");
  return out.work;
};

test("work starts in the first stage, with that in its history", () => {
  const work = started();
  assert.equal(work.stage, "build");
  assert.deepEqual(work.history, [
    { from: null, to: "build", at: "2026-11-22T10:00:00Z", by: "ada" },
  ]);
  assert.deepEqual(startWork("w", "t", [], "ada", "now"), {
    refused: "There is no stage for work to start in.",
  });
});

test("work moves on one stage at a time and the history keeps each move", () => {
  const work = moved(started(), "checklist");
  assert.equal(work.stage, "checklist");
  assert.deepEqual(work.history.at(-1), {
    from: "build",
    to: "checklist",
    at: "2026-11-22T11:00:00Z",
    by: "ada",
  });
  assert.deepEqual(moveWork(started(), "done", course, "ada", "now"), {
    refused: "Work goes through every stage: one at a time.",
  });
});

test("work leaves a stage only when its checks have passed, and says which are open", () => {
  let work = moved(started(), "checklist");
  assert.deepEqual(moveWork(work, "done", course, "ada", "now"), {
    refused: "Not yet: every item is ticked off; a person has looked.",
  });
  const first = passCheck(work, course, "ticked");
  assert.ok("work" in first);
  work = first.work;
  assert.deepEqual(
    openChecks(work, course).map((check) => check.id),
    ["seen"],
  );
  const second = passCheck(work, course, "seen");
  assert.ok("work" in second);
  assert.equal(moved(second.work, "done").stage, "done");
});

test("a check the stage does not ask for is refused", () => {
  assert.deepEqual(passCheck(started(), course, "ticked"), {
    refused: 'The stage "build" asks for no check "ticked".',
  });
});

test("work sent back needs no checks and starts the earlier stage's checks again", () => {
  let work = moved(started(), "checklist");
  const passed = passCheck(work, course, "ticked");
  assert.ok("work" in passed);
  work = moved(passed.work, "build");
  assert.deepEqual(work.passed, []);
  assert.equal(work.history.length, 3);
});

test("a stage that is not there, or the one it is in, is refused", () => {
  assert.deepEqual(moveWork(started(), "nowhere", course, "ada", "now"), {
    refused: 'There is no stage "nowhere".',
  });
  assert.deepEqual(moveWork(started(), "build", course, "ada", "now"), {
    refused: 'It is in "build" already.',
  });
  const lost = { ...started(), stage: "gone" };
  assert.deepEqual(moveWork(lost, "done", course, "ada", "now"), {
    refused: 'The stage "gone" is not in the order any more.',
  });
});

test("an extension keeps its part on the work under its own id", () => {
  const work = addPart(
    addPart(started(), "checklist", "note", "ok"),
    "checklist",
    "by",
    "ada",
  );
  assert.deepEqual(work.parts, { checklist: { note: "ok", by: "ada" } });
  assert.deepEqual(addPart(work, "other", "k", "v").parts.checklist, {
    note: "ok",
    by: "ada",
  });
});

test("the course is the stages in the team's order with their checks", () => {
  const make = (id: string, stage: Record<string, unknown>) =>
    defineExtension({
      id,
      name: id,
      about: id,
      stages: [{ id, name: id, ...stage }],
    });
  const extensions = [
    make("done", {}),
    make("checklist", {
      after: ["build"],
      before: ["done"],
      checks: [{ id: "ticked", name: "ticked" }],
    }),
    make("build", {}),
  ];
  assert.deepEqual(courseOf(extensions), [
    { id: "build", checks: [] },
    { id: "checklist", checks: [{ id: "ticked", name: "ticked" }] },
    { id: "done", checks: [] },
  ]);
  assert.deepEqual(
    courseOf(extensions, ["done", "build", "checklist"]).map((one) => one.id),
    ["done", "build", "checklist"],
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addPart,
  cardCourse,
  courseOf,
  defineExtension,
  keptIn,
  labelledStage,
  moveWork,
  openChecks,
  passCheck,
  pieceOf,
  stageLabel,
  stageOfCard,
  withKept,
  withoutKept,
  type Kept,
  type OnBoard,
  type Work,
} from "../src/index.ts";

// The piece of work is the board's card: a stage, a history, and moving on
// only when the stage's checks have passed.

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

const onBoard = (more: Partial<OnBoard> = {}): OnBoard => ({
  number: 7,
  title: "A page",
  done: false,
  closed: false,
  labels: [],
  ...more,
});

const started = (): Work => pieceOf(onBoard(), null, course);

const moved = (work: Work, to: string, at = "2026-11-22T11:00:00Z") => {
  const out = moveWork(work, to, course, "ada", at);
  assert.ok("work" in out, "refused" in out ? out.refused : "");
  return out.work;
};

test("a card is in Build until it is finished, with no history yet", () => {
  const work = started();
  assert.equal(work.id, "7");
  assert.equal(work.title, "A page");
  assert.equal(work.stage, "build");
  assert.deepEqual(work.history, []);
  assert.equal(stageOfCard(onBoard({ done: true }), course), "done");
  assert.equal(stageOfCard(onBoard({ closed: true }), course), "done");
});

test("a team's stage holds a card by its label while it is not finished", () => {
  const labels = [stageLabel("checklist"), "type: bug"];
  assert.equal(labelledStage(labels), "checklist");
  assert.equal(labelledStage(["type: bug"]), null);
  assert.equal(stageOfCard(onBoard({ labels }), course), "checklist");
  // Finished on the board: the label no longer holds it.
  assert.equal(stageOfCard(onBoard({ labels, done: true }), course), "done");
  assert.equal(stageOfCard(onBoard({ labels, closed: true }), course), "done");
  // The stage is gone (its extension was removed): back to Build.
  assert.equal(
    stageOfCard(onBoard({ labels: [stageLabel("gone")] }), course),
    "build",
  );
});

test("what a card kept counts for the stage it kept it in only", () => {
  const kept: Kept = {
    stage: "checklist",
    passed: ["ticked"],
    history: [{ from: "build", to: "checklist", at: "t", by: "ada" }],
    parts: { checklist: { note: "ok" } },
  };
  const held = pieceOf(
    onBoard({ labels: [stageLabel("checklist")] }),
    kept,
    course,
  );
  assert.deepEqual(held.passed, ["ticked"]);
  assert.equal(held.history.length, 1);
  assert.deepEqual(held.parts, { checklist: { note: "ok" } });
  // Moved on the board since: its checks start again, its history stays.
  const since = pieceOf(onBoard({ done: true }), kept, course);
  assert.deepEqual(since.passed, []);
  assert.equal(since.history.length, 1);
});

test("a card keeps its piece of work in its text, without touching the rest", () => {
  const kept: Kept = {
    stage: "checklist",
    passed: [],
    history: [{ from: "build", to: "checklist", at: "t", by: "a --> <b>" }],
    parts: {},
  };
  const body =
    "What it asks for.\n\n<!-- factory:agreed-plan -->\nPlan\n<!-- /factory:agreed-plan -->\n";
  const written = withKept(body, kept);
  assert.ok(written.startsWith(body.trimEnd()));
  assert.deepEqual(keptIn(written), kept);
  // Writing again replaces it; writing none takes it out.
  const again = withKept(written, { ...kept, passed: ["x"] });
  assert.equal(again.split("factory:work").length, 2);
  assert.deepEqual(keptIn(again)?.passed, ["x"]);
  assert.equal(withoutKept(written), body.trimEnd());
  assert.equal(withKept(written, null), body.trimEnd());
  assert.equal(withKept("", kept).startsWith("<!-- factory:work"), true);
});

test("a text with no piece of work, or a broken one, keeps none", () => {
  assert.equal(keptIn("Just words."), null);
  assert.equal(keptIn("<!-- factory:work\nnot json\n-->"), null);
  assert.equal(keptIn('<!-- factory:work\n{"stage":1}\n-->'), null);
  assert.equal(keptIn("<!-- factory:work\n{"), null);
  assert.equal(withoutKept("<!-- factory:work\n{"), "<!-- factory:work\n{");
});

test("a card goes through Build, a team's stages and Done only", () => {
  const all = [
    { id: "signals", checks: [] },
    { id: "explore", checks: [] },
    { id: "build", checks: [] },
    { id: "checklist", checks: [] },
    { id: "release", checks: [] },
    { id: "done", checks: [] },
    { id: "after", checks: [] },
  ];
  assert.deepEqual(
    cardCourse(all, ["signals", "explore", "release", "build", "done"]).map(
      (one) => one.id,
    ),
    ["build", "checklist", "done"],
  );
  assert.deepEqual(
    cardCourse(
      [
        { id: "done", checks: [] },
        { id: "build", checks: [] },
      ],
      [],
    ),
    [],
  );
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
  assert.equal(work.history.length, 2);
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

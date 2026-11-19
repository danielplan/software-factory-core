import assert from "node:assert/strict";
import { test } from "node:test";

import {
  asksIfItWorked,
  type BoardCard,
  decide,
  type Message,
} from "../src/builder/decide.ts";
import {
  isFactory,
  linkRepositoryFiles,
  markComment,
  readNote,
  readStatusLine,
  stripMarker,
} from "../src/builder/protocol.ts";

// The board's rules: what happens next to each card, from its stage and the
// notes in its thread; and how the factory's notes and an agent's status
// line are read.

let clock = 0;
const owner = (body: string): Message => ({
  author: "owner",
  body,
  at: `2026-01-01T00:00:${String(clock++).padStart(2, "0")}Z`,
  where: "card",
});
const factory = (body: string, note: Parameters<typeof markComment>[1]) =>
  owner(markComment(body, note));

function card(over: Partial<BoardCard> = {}): BoardCard {
  return {
    number: 1,
    title: "Invoices in euros",
    url: "https://github.com/o/r/issues/1",
    body: "",
    stage: "backlog",
    closed: false,
    agreedInText: false,
    waitsFor: [],
    thread: [],
    pullRequest: null,
    awaitsAnswer: false,
    ...over,
  };
}
const none = new Set<number>();

test("the factory's notes carry a hidden mark; an agent's answer ends with its status", () => {
  const said = markComment("Which currency?  ", "question");
  assert.equal(readNote(said), "question");
  assert.equal(isFactory(said), true);
  assert.equal(stripMarker(said), "Which currency?");
  assert.equal(readNote("<!-- software-factory:unknown -->"), null);
  assert.equal(isFactory("A plain comment"), false);
  assert.equal(stripMarker("A plain comment"), "A plain comment");

  assert.deepEqual(readStatusLine("Done it.\n**STATUS: done**\n"), {
    text: "Done it.",
    status: "done",
  });
  assert.deepEqual(readStatusLine("No status here"), {
    text: "No status here",
    status: null,
  });
  assert.equal(readStatusLine("Hm\nSTATUS: two words").status, null);

  assert.equal(
    linkRepositoryFiles(
      "![shot](runs/1.png) [run](./runs/1.md) [web](https://x.y) [top](#a)",
      "o/r",
      "factory/card-1",
    ),
    "![shot](https://github.com/o/r/blob/factory/card-1/runs/1.png?raw=true) [run](https://github.com/o/r/blob/factory/card-1/runs/1.md) [web](https://x.y) [top](#a)",
  );
});

test("finished cards go to Done, cards in no column to the Backlog, busy ones wait", () => {
  const decision = decide(
    [
      card({ number: 1, closed: true }),
      card({ number: 2, closed: true, stage: "done" }),
      card({
        number: 3,
        stage: "review",
        pullRequest: {
          number: 9,
          url: "u",
          state: "MERGED",
          draft: false,
          thread: [],
        },
      }),
      card({ number: 4, stage: null }),
      card({ number: 5 }),
    ],
    new Set([5]),
  );
  assert.deepEqual(decision.moves, [
    { number: 1, stage: "done" },
    { number: 3, stage: "done" },
    { number: 4, stage: "backlog" },
  ]);
  assert.deepEqual(decision.jobs, []);
});

test("a card Kobble waits for is never finished silently: it asks in Done until answered", () => {
  const merged = {
    number: 9,
    url: "u",
    state: "MERGED" as const,
    draft: false,
    thread: [],
  };
  const decision = decide(
    [
      card({ number: 1, closed: true, awaitsAnswer: true }),
      card({
        number: 2,
        stage: "review",
        pullRequest: merged,
        awaitsAnswer: true,
      }),
      card({ number: 3, stage: "done", awaitsAnswer: true }),
      // Answered already, or not Kobble's: finished as before.
      card({ number: 4, closed: true, stage: "done" }),
      // Not finished yet: it is worked on as before.
      card({ number: 5, stage: "todo", awaitsAnswer: true }),
    ],
    none,
  );
  assert.deepEqual(decision.asks, [1, 2, 3]);
  assert.deepEqual(decision.moves, [
    { number: 1, stage: "done" },
    { number: 2, stage: "done" },
  ]);
  assert.deepEqual(
    decision.jobs.map((j) => [j.kind, j.number]),
    [["build", 5]],
  );
  assert.equal(asksIfItWorked(card({ closed: true })), false);
  assert.equal(
    asksIfItWorked(card({ stage: "todo", awaitsAnswer: true })),
    false,
  );
});

test("To do builds the card as it is; it waits for the cards it depends on and for an open question", () => {
  const todo = (over: Partial<BoardCard>) =>
    decide([card({ stage: "todo", ...over })], none);
  const build = [{ lane: "build", kind: "build", number: 1 }];
  // Its text is the plan: no planning step, nothing moved back.
  assert.deepEqual(todo({}).jobs, build);
  assert.deepEqual(todo({}).moves, []);
  // A card that depends on an open card waits in To do, untouched.
  const waiting = todo({ waitsFor: [7] });
  assert.deepEqual(waiting.jobs, []);
  assert.deepEqual(waiting.moves, []);
  // The builder's question waits for the owner's answer, then it builds.
  const blocked = factory("Which font?", "blocked");
  assert.deepEqual(todo({ thread: [blocked] }).jobs, []);
  assert.deepEqual(todo({ thread: [blocked] }).moves, []);
  assert.deepEqual(todo({ thread: [blocked, owner("Inter")] }).jobs, build);
  const asked = factory("Really?", "question");
  assert.deepEqual(todo({ thread: [asked] }).jobs, []);
  // A technical failure does not wait: To do again tries again.
  assert.deepEqual(
    todo({ thread: [factory("Crashed", "failed")] }).jobs,
    build,
  );
});

test("an interrupted build resumes, unless it waits for the owner after failed checks", () => {
  const doing = (thread: Message[]) =>
    decide([card({ stage: "doing", thread })], none).jobs;
  assert.deepEqual(doing([]), [{ lane: "build", kind: "build", number: 1 }]);
  const failed = factory("Still red", "checks-failed");
  assert.deepEqual(doing([failed]), []);
  assert.deepEqual(doing([failed, owner("Try the other port")]), [
    { lane: "build", kind: "build", number: 1 },
  ]);
  // Gave up without a red check (it could not finish): it waits the same way.
  const stopped = factory("Stopped", "failed");
  assert.deepEqual(doing([stopped]), []);
  assert.deepEqual(doing([stopped, owner("Go on")]), [
    { lane: "build", kind: "build", number: 1 },
  ]);
});

test("review comments on the card or the pull request are answered, first of all", () => {
  const pr = (thread: Message[]) => ({
    number: 9,
    url: "u",
    state: "OPEN" as const,
    draft: false,
    thread: thread.map((m) => ({ ...m, where: "pull request" as const })),
  });
  const ready = factory("Built", "review-ready");
  const review = (over: Partial<BoardCard>) =>
    card({ number: 2, stage: "review", ...over });
  assert.deepEqual(
    decide([review({ thread: [ready], pullRequest: pr([]) })], none).jobs,
    [],
  );
  assert.deepEqual(decide([review({ thread: [owner("Hm")] })], none).jobs, []);
  const decision = decide(
    [
      card({ number: 1, stage: "todo", agreedInText: true }),
      // In the backlog: not the factory's to build yet.
      card({ number: 3 }),
      review({ thread: [ready], pullRequest: pr([owner("Rename it")]) }),
    ],
    none,
  );
  assert.deepEqual(
    decision.jobs.map((j) => [j.kind, j.number]),
    [
      ["feedback", 2],
      ["build", 1],
    ],
  );
});

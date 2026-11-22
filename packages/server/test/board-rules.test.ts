import assert from "node:assert/strict";
import { test } from "node:test";

import {
  asksIfItWorked,
  asksTheBuilder,
  type BoardCard,
  decide,
  handedBack,
  type Message,
  stuckOf,
  waitsForOwner,
} from "../src/builder/decide.ts";
import {
  askedComment,
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
    stuck: false,
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

test("To do builds the card as it is; it waits for the cards it depends on", () => {
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
  // A stuck card moved to To do is handed back: built, with or without a
  // comment since.
  const blocked = factory("Which font?", "blocked");
  assert.deepEqual(todo({ thread: [blocked], stuck: true }).jobs, build);
  assert.deepEqual(todo({ thread: [blocked], stuck: true }).moves, []);
  assert.deepEqual(todo({ thread: [blocked, owner("Inter")] }).jobs, build);
  // A technical failure does not wait: To do again tries again.
  assert.deepEqual(
    todo({ thread: [factory("Crashed", "failed")] }).jobs,
    build,
  );
});

test("a card an older builder left in To do with an open question goes to Backlog as stuck", () => {
  const todo = (thread: Message[]) =>
    decide([card({ stage: "todo", thread })], none);
  for (const asked of [
    factory("Which font?", "blocked"),
    factory("Really?", "question"),
  ]) {
    const decision = todo([factory("Started", "started"), asked]);
    assert.deepEqual(decision.jobs, []);
    assert.deepEqual(decision.moves, [{ number: 1, stage: "backlog" }]);
    assert.deepEqual(decision.stuck, [1]);
  }
});

test("a card is the builder's only when the builder itself last moved it to In progress", () => {
  const doing = (thread: Message[], over: Partial<BoardCard> = {}) =>
    decide([card({ stage: "doing", thread, ...over })], none);
  const resumed = [{ lane: "build", kind: "build", number: 1 }];
  const started = factory("The builder started on this card.", "started");
  // Interrupted: the builder's start is its last word (reports aside).
  assert.deepEqual(doing([started]).jobs, resumed);
  assert.deepEqual(
    doing([
      started,
      factory("Session 1 done", "progress"),
      owner("Looks good so far"),
    ]).jobs,
    resumed,
  );
  // Moved there by a person: no start, or a later word ended the builder's
  // (it asked, handed it to review, saw it worked on by hand).
  for (const thread of [
    [],
    [owner("I'll do this one")],
    [started, factory("Which font?", "blocked"), owner("Inter")],
    [started, factory("Ready for review", "review-ready")],
    [started, factory("Open in another copy", "by-hand")],
  ]) {
    const decision = doing(thread);
    assert.deepEqual(decision.jobs, [], JSON.stringify(thread));
    assert.deepEqual(decision.moves, []);
  }
  // A stuck card a person took to In progress is theirs too.
  const gaveUp = factory("Still red", "checks-failed");
  assert.deepEqual(doing([started, gaveUp], { stuck: true }).jobs, []);
  assert.deepEqual(doing([started, gaveUp], { stuck: true }).moves, []);
});

test("a card an older builder left in In progress after giving up goes to Backlog as stuck, or to To do when the owner answered", () => {
  const doing = (thread: Message[]) =>
    decide([card({ stage: "doing", thread })], none);
  const started = factory("Started", "started");
  for (const gaveUp of [
    factory("Still red", "checks-failed"),
    factory("Stopped", "failed"),
    factory("Not finished", "out-of-sessions"),
  ]) {
    const waiting = doing([started, gaveUp]);
    assert.deepEqual(waiting.jobs, []);
    assert.deepEqual(waiting.moves, [{ number: 1, stage: "backlog" }]);
    assert.deepEqual(waiting.stuck, [1]);
    const answered = doing([started, gaveUp, owner("Try the other port")]);
    assert.deepEqual(answered.moves, [{ number: 1, stage: "todo" }]);
    assert.deepEqual(answered.stuck, []);
  }
});

test("stuck cards wait in Backlog for the owner, shown with what the builder said; their question is not asked twice", () => {
  const blocked = factory("Which font?", "blocked");
  const decision = decide([card({ thread: [blocked], stuck: true })], none);
  assert.deepEqual(decision.jobs, []);
  assert.deepEqual(decision.moves, []);
  assert.equal(waitsForOwner(card({ thread: [blocked], stuck: true })), null);
  assert.equal(waitsForOwner(card({ thread: [blocked] }))?.text, "Which font?");
  const said = stuckOf(
    card({
      thread: [factory("Started", "started"), blocked, owner("Hm")],
      stuck: true,
    }),
  );
  assert.ok(said);
  assert.equal(said.note, "blocked");
  assert.equal(said.text, "Which font?");
  assert.equal(said.since, blocked.at);
  assert.equal(stuckOf(card({ thread: [blocked] })), null);
  assert.equal(
    stuckOf(card({ thread: [blocked], stuck: true, closed: true })),
    null,
  );
  // Handed back already: in To do, it is not stuck any more; with a hint
  // from the owner, the page says so on it.
  assert.equal(
    stuckOf(card({ stage: "todo", thread: [blocked], stuck: true })),
    null,
  );
  const todo = (thread: Message[]) => card({ stage: "todo", thread });
  assert.equal(handedBack(todo([blocked, owner("Inter")])), true);
  assert.equal(handedBack(todo([blocked])), false);
  assert.equal(handedBack(todo([owner("Hm")])), false);
  assert.equal(
    handedBack(card({ thread: [blocked, owner("Inter")], stuck: true })),
    false,
  );
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

test("the owner's question on a stuck card starts the builder's reply, once; the card stays stuck", () => {
  const stopped = factory("Out of sessions", "out-of-sessions");
  const asked = owner(askedComment("What is left?"));
  const stuck = (thread: Message[]) => card({ thread, stuck: true });
  assert.equal(stripMarker(asked.body), "What is left?");
  assert.equal(isFactory(asked.body), false);
  assert.deepEqual(decide([stuck([stopped, asked])], none).jobs, [
    { lane: "chat", kind: "reply", number: 1 },
  ]);
  assert.deepEqual(decide([stuck([stopped, asked])], none).moves, []);
  // A plain comment is a hint, not a question; a busy card waits.
  assert.deepEqual(decide([stuck([stopped, owner("Hm")])], none).jobs, []);
  assert.deepEqual(decide([stuck([stopped, asked])], new Set([1])).jobs, []);
  const replied = factory("Step 3.", "replied");
  assert.equal(asksTheBuilder(stuck([stopped, asked, replied])), false);
  assert.deepEqual(decide([stuck([stopped, asked, replied])], none).jobs, []);
  // A question from before the builder stopped again is not answered.
  assert.equal(
    asksTheBuilder(stuck([asked, factory("Started", "started"), stopped])),
    false,
  );
  const said = stuckOf(stuck([stopped, asked, replied, owner("Thanks")]));
  assert.ok(said);
  assert.equal(said.note, "out-of-sessions");
  assert.equal(said.text, "Out of sessions");
  assert.deepEqual(
    said.talk.map((m) => [m.by, m.text]),
    [
      ["owner", "What is left?"],
      ["builder", "Step 3."],
      ["owner", "Thanks"],
    ],
  );
  assert.equal(said.answering, false);
  assert.equal(stuckOf(stuck([stopped, asked]))?.answering, true);
  // Sent on with Continue, the card goes back to the builder as before.
  assert.equal(
    handedBack(
      card({
        stage: "todo",
        thread: [stopped, asked, replied, owner("Go on")],
      }),
    ),
    true,
  );
});

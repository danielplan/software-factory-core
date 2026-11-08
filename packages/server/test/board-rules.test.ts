import assert from "node:assert/strict";
import { test } from "node:test";

import { type BoardCard, decide, type Message } from "../src/builder/decide.ts";
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
    stage: "planning",
    closed: false,
    agreedInText: false,
    thread: [],
    pullRequest: null,
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

test("the coach speaks first in Planning, then whenever the owner answers", () => {
  const asked = [owner("Please plan"), factory("Which currency?", "question")];
  const jobs = (thread: Message[]) => decide([card({ thread })], none).jobs;
  assert.deepEqual(jobs([]), [{ lane: "chat", kind: "plan", number: 1 }]);
  assert.deepEqual(jobs(asked), []);
  assert.deepEqual(jobs([...asked, owner("Euros")]), [
    { lane: "chat", kind: "plan", number: 1 },
  ]);
  // An announcement is not the factory's last word.
  assert.deepEqual(jobs([...asked, factory("Moved", "moved-back")]), []);
});

test("Ready builds only an agreed plan; otherwise the card goes back with why", () => {
  const ready = (over: Partial<BoardCard>) =>
    decide([card({ stage: "todo", ...over })], none);
  const build = [{ lane: "build", kind: "build", number: 1 }];
  const back = (why: string) => {
    return (d: ReturnType<typeof decide>) => {
      assert.deepEqual(d.jobs, []);
      assert.deepEqual(d.moves, [{ number: 1, stage: "planning" }]);
      assert.match(d.comments[0]?.body ?? "", new RegExp(why));
      assert.equal(d.comments[0]?.note, "moved-back");
    };
  };
  back("not agreed yet")(ready({}));
  assert.deepEqual(ready({ agreedInText: true }).jobs, build);
  const agreed = factory("The plan", "plan-agreed");
  assert.deepEqual(ready({ thread: [agreed] }).jobs, build);
  back("new comment after the agreed plan")(
    ready({ thread: [agreed, owner("One more thing")] }),
  );
  back("question about the plan is still open")(
    ready({ thread: [agreed, factory("Really?", "question")] }),
  );
  const blocked = factory("Which font?", "blocked");
  back("builder's question is not answered")(
    ready({ thread: [agreed, blocked] }),
  );
  assert.deepEqual(
    ready({ thread: [agreed, blocked, owner("Inter")] }).jobs,
    build,
  );
  // A technical failure keeps the plan: Ready again tries again.
  assert.deepEqual(
    ready({ thread: [agreed, factory("Crashed", "failed")] }).jobs,
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
      ["plan", 3],
    ],
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { withPlan } from "../src/cards/cards.ts";
import { waitsForOwner } from "../src/extensions/factory/builder/decide.ts";
import {
  markComment,
  readAsk,
  stripMarker,
} from "../src/extensions/factory/builder/protocol.ts";
import {
  type Kept,
  pretendClaude,
  project,
  settled,
  setUp,
} from "./builder-stage.ts";

const ASKED = `I need one decision.

<!-- software-factory:ask
{"about": "Prices on the invoice", "where": "The backend is done",
 "question": "Show prices with or without tax?",
 "answers": [
   {"key": "A", "answer": "With tax", "means": "What customers pay"},
   {"answer": "Without tax", "means": "What the accountant wants"},
   {"answer": ""}
 ],
 "suggested": "A"}
-->`;

test("a question in the page's shape is read; the rest stays words", () => {
  const ask = readAsk(ASKED);
  assert.ok(ask);
  assert.equal(ask.question, "Show prices with or without tax?");
  assert.deepEqual(
    ask.answers.map((one) => one.key),
    ["A", "B"],
  );
  assert.equal(ask.suggested, "A");
  assert.equal(
    stripMarker(markComment(ASKED, "blocked")),
    "I need one decision.",
  );
  assert.equal(readAsk("no block"), null);
  assert.equal(readAsk("<!-- software-factory:ask {not json} -->"), null);
  assert.equal(readAsk('<!-- software-factory:ask {"answers": []} -->'), null);
});

test("the factory waits for the owner after a question or a stop, until they answer", () => {
  const at = (body: string, n: number) => ({
    author: "x",
    body,
    at: String(n),
    where: "card" as const,
  });
  const asked = at(markComment(ASKED, "question"), 1);
  assert.equal(
    waitsForOwner({ closed: false, thread: [asked] })?.ask?.question,
    "Show prices with or without tax?",
  );
  assert.equal(
    waitsForOwner({ closed: false, thread: [asked, at("**A**: With tax", 2)] }),
    null,
  );
  assert.equal(waitsForOwner({ closed: true, thread: [asked] }), null);
  assert.equal(
    waitsForOwner({
      closed: false,
      thread: [at(markComment("Started.", "started"), 1)],
    }),
    null,
  );
});

test("the owner answers from the Factory page: the answer is a comment on the card, and a stuck card goes back to To do with it", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>([
    [
      8,
      {
        title: "Prices",
        stage: "todo",
        body: withPlan("Prices.", ""),
        comments: [
          {
            author: "me",
            body: markComment(ASKED, "question"),
            at: "2026-01-01T00:00:00Z",
            where: "card",
          },
        ],
      },
    ],
  ]);
  const { claude } = pretendClaude(() => "Thanks.\nSTATUS: question");
  const { work } = setUp(kept, claude, copy, []);
  work.switch("build", true);
  await settled(work);
  // An older builder left it waiting in To do: it goes to Backlog, stuck,
  // shown with its question in the Stuck list on the Factory page.
  assert.equal(kept.get(8)?.stage, "backlog");
  assert.deepEqual(work.view().asking, []);
  const stuck = work.view().stuck?.[0];
  assert.equal(stuck?.number, 8);
  assert.equal(stuck.note, "question");
  assert.equal(stuck.ask?.question, "Show prices with or without tax?");
  work.switch("build", false);
  await work.answer(8, "**A**: With tax");
  assert.equal(kept.get(8)?.comments.at(-1)?.body, "**A**: With tax");
  assert.equal(kept.get(8)?.stage, "todo");
  assert.equal(work.view().stuck?.length, 0);
  // On the board, it says the hint is with the builder.
  work.switch("chat", true);
  await settled(work);
  assert.equal(work.view().cards.find((c) => c.number === 8)?.hint, true);
  work.switch("chat", false);
});

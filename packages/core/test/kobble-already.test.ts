import assert from "node:assert/strict";
import { test } from "node:test";

import {
  alreadyFor,
  heardOf,
  type Exploration,
  type KobbleSignal,
  titleOf,
} from "../src/index.ts";
import { contentWords, covered, jaccard } from "../src/kobble/already.ts";

// The "already" check: a plain rule on shared content words, for now.

const exploration = (more: Partial<Exploration>): Exploration => ({
  id: "X-1",
  title: "The basket is empty when people come back to pay",
  status: "exploring",
  personas: [],
  signals: [],
  heard: [],
  problem:
    "People fill the basket in the morning and find it empty in the evening.",
  created: "2026-11-10T09:00:00.000Z",
  work: null,
  ...more,
});

const fixedSignal: KobbleSignal = {
  id: "S-0001",
  type: "bug",
  source: "errors",
  sourceId: "ev-1",
  customer: null,
  persona: null,
  at: "2026-11-12T07:30:00.000Z",
  text: "The order confirmation email failed to send.",
  status: "fixed",
  to: "#41",
  already: null,
};

test("content words leave out small words, punctuation and plural s", () => {
  assert.deepEqual(
    [...contentWords("“Where did my BASKETS go? I had shoes in there.”")],
    ["basket", "shoe"],
  );
  assert.deepEqual(
    [...contentWords("The address is wrong")],
    ["address", "wrong"],
  );
  assert.deepEqual(covered(new Set(), new Set(["a"])), { score: 0, shared: 0 });
  assert.deepEqual(covered(new Set(["a", "b"]), new Set(["a"])), {
    score: 0.5,
    shared: 1,
  });
  assert.equal(jaccard(new Set(), new Set()), 0);
  assert.equal(jaccard(new Set(["a", "b"]), new Set(["b", "c"])), 1 / 3);
});

test("a signal about an open exploration finds it", () => {
  const found = alreadyFor(
    "My basket was empty again when I came back in the evening.",
    [exploration({})],
    [],
  );
  assert.deepEqual(found, {
    kind: "exploration",
    id: "X-1",
    title: "The basket is empty when people come back to pay",
  });
});

test("what an exploration heard counts as what it is about", () => {
  const heard: KobbleSignal = {
    ...fixedSignal,
    id: "S-0002",
    status: "explored",
    to: "X-2",
    text: "We want one invoice at the end of the month for every supplier order.",
  };
  const monthly = exploration({
    id: "X-2",
    title: "Paying once a month",
    problem: "",
    signals: ["S-0002"],
    heard: [heardOf(heard)],
  });
  assert.equal(
    alreadyFor("Could we get a monthly invoice for our orders?", [monthly], [])
      ?.id,
    "X-2",
  );
});

test("a signal about something else finds nothing", () => {
  assert.equal(
    alreadyFor(
      "Could we get one invoice at the end of the month for all our orders?",
      [exploration({})],
      [fixedSignal],
    ),
    null,
  );
  // One shared word is not enough.
  assert.equal(alreadyFor("Basket", [exploration({})], []), null);
  // Explorations handed off or dropped are not open any more.
  assert.equal(
    alreadyFor(
      "My basket was empty when I came back in the evening.",
      [
        exploration({ status: "dropped" }),
        exploration({ id: "X-2", status: "handed-off" }),
      ],
      [],
    ),
    null,
  );
});

test("the closest open exploration wins", () => {
  const found = alreadyFor(
    "The basket is empty in the evening after I filled it in the morning.",
    [
      exploration({ id: "X-1", title: "Basket in the evening", problem: "" }),
      exploration({ id: "X-2" }),
    ],
    [],
  );
  assert.equal(found?.id, "X-2");
});

test("a signal saying nearly the same as a fixed one finds its fix", () => {
  assert.deepEqual(
    alreadyFor(
      "The order confirmation email failed to send for three orders.",
      [],
      [fixedSignal],
    ),
    {
      kind: "work",
      id: "#41",
      title: "The order confirmation email failed to send",
    },
  );
  // Only part of it: not the same thing.
  assert.equal(
    alreadyFor("The welcome email looks odd on my phone.", [], [fixedSignal]),
    null,
  );
  // Fixed, but not sent anywhere yet: nothing to point to.
  assert.equal(
    alreadyFor(fixedSignal.text, [], [{ ...fixedSignal, to: null }]),
    null,
  );
});

test("a title is the first sentence, without quotes, cut at a word", () => {
  assert.equal(
    titleOf("“Where did my basket go? I had shoes.”"),
    "Where did my basket go?",
  );
  assert.equal(titleOf("Checkout is slow. Very slow."), "Checkout is slow");
  assert.equal(titleOf("No full stop at all"), "No full stop at all");
  const long = titleOf(
    "When I open the order page on my phone in the evening the list of my orders takes a very long time to show anything at all",
  );
  assert.ok(long.endsWith("…"));
  assert.ok(long.length <= 81);
  assert.ok(!long.includes("  "));
});

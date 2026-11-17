import assert from "node:assert/strict";
import { test } from "node:test";

import {
  idFrom,
  kindOf,
  quoted,
  shownOf,
  signalsHash,
} from "../src/signals/view.ts";

// Signals: what kind each one is, its address, and which one is shown,
// the next one once a signal is handled.

test("a signal's kind comes from how the kobold sorted it", () => {
  assert.equal(kindOf({ sortedAs: "bug" }), "bug");
  assert.equal(kindOf({ sortedAs: "need" }), "need");
  assert.equal(kindOf({ sortedAs: "update" }), "update");
  assert.equal(kindOf({ sortedAs: "question" }), "question");
  assert.equal(kindOf({ sortedAs: "unsure" }), "other");
});

test("one signal's address, and the signal an address names", () => {
  assert.equal(signalsHash(), "#signals");
  assert.equal(signalsHash("s 1"), "#signals/s%201");
  assert.equal(idFrom(null), null);
  assert.equal(idFrom(""), null);
  assert.equal(idFrom("s%201"), "s 1");
});

test("the named signal first, then the one shown, then the next at its place", () => {
  const ids = ["a", "b", "c"];
  const none = { ids: [], shown: null };
  assert.equal(shownOf(none, ids, null), "a");
  assert.equal(shownOf(none, ids, "b"), "b");
  assert.equal(shownOf(none, ids, "zzz"), "a");
  assert.equal(shownOf({ ids, shown: "c" }, ids, null), "c");
  // b was handled: c, now at b's place, is shown.
  assert.equal(shownOf({ ids, shown: "b" }, ["a", "c"], "b"), "c");
  // The last was handled: the one before it.
  assert.equal(shownOf({ ids, shown: "c" }, ["a", "b"], "c"), "b");
  assert.equal(shownOf({ ids, shown: "a" }, [], "a"), null);
});

test("what was said is in quotation marks once", () => {
  assert.equal(
    quoted("“The app is slow at lunchtime.”"),
    "“The app is slow at lunchtime.”",
  );
  assert.equal(quoted('"How do I change it?"'), "“How do I change it?”");
  assert.equal(
    quoted("Checkout fails on Safari 18"),
    "“Checkout fails on Safari 18”",
  );
  assert.equal(quoted("  It's fine  "), "“It's fine”");
});

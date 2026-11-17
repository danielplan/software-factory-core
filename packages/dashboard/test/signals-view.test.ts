import assert from "node:assert/strict";
import { test } from "node:test";

import type { SignalView } from "../src/api.ts";
import {
  byColumn,
  columnOf,
  idFrom,
  quoted,
  signalsHash,
  triageOf,
} from "../src/signals/view.ts";

// Signals: the address of the one opened, the board's columns, what was
// said in quotation marks, and each signal's actions.

test("one signal's address, and the signal an address names", () => {
  assert.equal(signalsHash(), "#signals");
  assert.equal(signalsHash("s 1"), "#signals/s%201");
  assert.equal(idFrom(null), null);
  assert.equal(idFrom(""), null);
  assert.equal(idFrom("s%201"), "s 1");
});

test("each signal goes in its column: bugs, requests, the rest as feedback", () => {
  const as = (sortedAs: SignalView["sortedAs"]) => ({ sortedAs });
  assert.equal(columnOf(as("bug")), "bugs");
  assert.equal(columnOf(as("need")), "requests");
  assert.equal(columnOf(as("update")), "requests");
  assert.equal(columnOf(as("question")), "feedback");
  assert.equal(columnOf(as("unsure")), "feedback");
  const signals = [
    { id: "a", sortedAs: "need" as const },
    { id: "b", sortedAs: "bug" as const },
    { id: "c", sortedAs: "need" as const },
  ];
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(byColumn(signals)).map(([column, list]) => [
        column,
        list.map((one) => one.id),
      ]),
    ),
    { bugs: ["b"], requests: ["a", "c"], feedback: [] },
  );
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

test("a signal's actions follow where the kobold put it", () => {
  const idea = { id: "wish", title: "Wish list" };
  assert.deepEqual(triageOf("story", true, idea), {
    fix: true,
    dismiss: true,
    addTo: idea,
    agreeInMenu: false,
  });
  assert.deepEqual(triageOf("story", true, null), {
    fix: true,
    dismiss: true,
    addTo: null,
    agreeInMenu: true,
  });
  assert.deepEqual(triageOf("build", false, idea), {
    fix: false,
    dismiss: true,
    addTo: null,
    agreeInMenu: false,
  });
  assert.equal(triageOf("ticket", true, null).fix, false);
  assert.equal(triageOf("answered", true, null).dismiss, false);
});

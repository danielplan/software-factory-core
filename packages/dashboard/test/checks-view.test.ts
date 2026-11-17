import assert from "node:assert/strict";
import { test } from "node:test";

import { activityWords, searchedWords } from "../src/checks/activity.ts";
import {
  type CheckView,
  checkupOf,
  type ChecksView,
  type Finding,
  startable,
} from "../src/checks/view.ts";

// The Check-up page: the open findings by how serious they are (new ones
// first), the handled ones apart, what runs, whether all is clear, and what
// the kobold does in plain words.

const finding = (id: string, more: Partial<Finding> = {}): Finding => ({
  id,
  title: id,
  happens: "",
  where: "shop/src/a.ts:1",
  kind: "bug",
  severity: "medium",
  suggestion: "",
  status: "open",
  issue: null,
  fresh: false,
  ...more,
});

const check = (product: string, more: Partial<CheckView> = {}): CheckView => ({
  product,
  job: `job-${product}`,
  started: "2026-11-17T10:00:00.000Z",
  ended: "2026-11-17T10:05:00.000Z",
  state: "done",
  said: null,
  findings: [],
  incoming: [],
  kept: 0,
  activity: null,
  ...more,
});

const view = (checks: CheckView[]): ChecksView => ({
  products: [
    { id: "shop", name: "Shop" },
    { id: "orders", name: "Orders" },
  ],
  checks,
});

test("nothing checked yet: no findings, nothing running, not all clear", () => {
  const empty = checkupOf(null);
  assert.deepEqual(empty.open, []);
  assert.equal(empty.allClear, false);
  assert.equal(empty.lastEnded, null);
  assert.deepEqual(startable(view([])), ["shop", "orders"]);
});

test("open findings by how serious they are, the most serious first, handled ones apart", () => {
  const read = checkupOf(
    view([
      check("shop", {
        findings: [
          finding("a", { severity: "low" }),
          finding("b", { severity: "high" }),
          finding("c", { status: "dismissed" }),
        ],
      }),
      check("orders", {
        ended: "2026-11-17T11:00:00.000Z",
        findings: [finding("d", { severity: "high", status: "sent" })],
      }),
    ]),
  );
  assert.deepEqual(
    read.open.map((group) => [
      group.severity,
      group.findings.map((one) => one.id),
    ]),
    [
      ["high", ["b"]],
      ["low", ["a"]],
    ],
  );
  assert.equal(read.open[0]?.findings[0]?.productName, "Shop");
  assert.deepEqual(
    read.handled.map((one) => one.id),
    ["c", "d"],
  );
  assert.equal(read.lastEnded, "2026-11-17T11:00:00.000Z");
  assert.equal(read.allClear, false);
});

test("all clear once a check is done with nothing open; a running one is not startable", () => {
  const clear = checkupOf(
    view([check("shop", { findings: [finding("a", { status: "sent" })] })]),
  );
  assert.equal(clear.allClear, true);
  const running = view([check("shop", { state: "running", ended: null })]);
  assert.equal(checkupOf(running).running.length, 1);
  assert.equal(checkupOf(running).allClear, false);
  assert.deepEqual(startable(running), ["orders"]);
  const failed = checkupOf(view([check("shop", { state: "failed" })]));
  assert.equal(failed.failed.length, 1);
  assert.equal(failed.allClear, false);
});

test("the new ones first within how serious they are, and how many were new as the server counted", () => {
  const read = checkupOf(
    view([
      check("shop", {
        kept: 1,
        findings: [finding("old"), finding("new", { fresh: true })],
      }),
      check("orders", { kept: 2 }),
    ]),
  );
  assert.deepEqual(
    read.open[0]?.findings.map((one) => one.id),
    ["new", "old"],
  );
  assert.equal(read.found, 3);
});

test("what the kobold does, in plain words: never a search as written", () => {
  assert.equal(activityWords(null), "Looking around…");
  assert.equal(
    activityWords("Reading apps/web/src/lib/records/RecordSheet.svelte"),
    "Reading the code of “records”…",
  );
  assert.equal(
    activityWords("Reading packages/spec/src/groups.ts"),
    "Reading the code of “groups”…",
  );
  assert.equal(
    activityWords("Reading apps/api/BLUEPRINT.md"),
    "Reading the product's notes…",
  );
  assert.equal(
    activityWords("Reading apps/api/test/cart.test.ts"),
    "Reading the tests…",
  );
  assert.equal(
    activityWords("Reading how values (money, dates) are checked."),
    "Looking around…",
  );
  assert.equal(
    activityWords(
      "Searching for “(?i)util:http|ssrf|internal address|private network”",
    ),
    "Looking for “ssrf”, “internal address”…",
  );
  assert.equal(
    activityWords("Searching for “sql\\.raw\\(”"),
    "Searching the code…",
  );
  assert.deepEqual(searchedWords("^\\s+(async )?(catalog|visible)\\("), []);
  assert.equal(
    activityWords("Looking for files **/*.svelte"),
    "Finding its way around the files…",
  );
  assert.equal(
    activityWords("Writing down a problem it found"),
    "Writing down a problem it found…",
  );
  assert.equal(activityWords("Running: npm test"), "Looking around…");
});

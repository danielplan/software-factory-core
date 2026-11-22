import assert from "node:assert/strict";
import { test } from "node:test";

import {
  recordsNamedReport,
  recordsNotNamed,
} from "../src/extensions/factory/builder/record-named.ts";

// Before a pull request: a record the branch adds is named after its card.

test("a record named after the card passes", () => {
  assert.deepEqual(recordsNotNamed(12, ["runs/issue-12-list.md"]), []);
  assert.deepEqual(recordsNotNamed(12, ["factory/runs/issue-12-list.md"]), []);
});

test("a record with no card number fails", () => {
  assert.deepEqual(recordsNotNamed(12, ["runs/005-fix.md"]), [
    "runs/005-fix.md",
  ]);
});

test("a record named after another card fails, also one that starts with the same digits", () => {
  assert.deepEqual(
    recordsNotNamed(1, ["runs/issue-12-list.md", "runs/issue-2-x.md"]),
    ["runs/issue-12-list.md", "runs/issue-2-x.md"],
  );
});

test("no record, pictures in a record's folder, the README and other files pass", () => {
  assert.deepEqual(
    recordsNotNamed(12, [
      "src/list.ts",
      "runs/issue-12-list/shot.png",
      "runs/README.md",
      "docs/a.md",
    ]),
    [],
  );
});

test("the report names the files and the rule, and is empty when all is well", () => {
  assert.equal(recordsNamedReport(12, []), "");
  const report = recordsNamedReport(12, ["runs/005-fix.md"]);
  assert.match(report, /runs\/issue-12-short-name\.md/);
  assert.match(report, /`runs\/005-fix\.md`/);
});

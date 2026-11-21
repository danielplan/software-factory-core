import assert from "node:assert/strict";
import { test } from "node:test";

import { knowledgeOwed } from "../src/builder/knowledge-kept.ts";
import { NOTHING_TO_KEEP } from "../src/builder/prompts.ts";

// Before a pull request: code changed without the knowledge base owes it a
// round of update-context, unless the run file says why nothing changes.

const none = () => "";

test("code changed and no knowledge file: the knowledge base is owed", () => {
  assert.equal(
    knowledgeOwed(["packages/app/src/list.tsx", "runs/issue-4-list.md"], none),
    true,
  );
});

test("a docs page, a context page, a blueprint or AGENTS.md kept with it: nothing owed", () => {
  for (const kept of [
    "docs/reference/features/list.md",
    "factory/context/reference/list.md",
    "packages/app/BLUEPRINT.md",
    "AGENTS.md",
  ])
    assert.equal(
      knowledgeOwed(["packages/app/src/list.tsx", kept], none),
      false,
    );
});

test("only the run, pictures or the changelog changed: nothing owed", () => {
  assert.equal(
    knowledgeOwed(
      ["runs/issue-4-list.md", "runs/issue-4-list/shot.png", "CHANGELOG.md"],
      none,
    ),
    false,
  );
});

test("the run file says why nothing changes: nothing owed", () => {
  assert.equal(
    knowledgeOwed(["src/fix.ts", "runs/issue-5-fix.md"], (file) =>
      file === "runs/issue-5-fix.md"
        ? `## Result\n\n${NOTHING_TO_KEEP} a typo in a log line.`
        : "",
    ),
    false,
  );
});

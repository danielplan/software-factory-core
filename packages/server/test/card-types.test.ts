import assert from "node:assert/strict";
import { test } from "node:test";

import { withKept } from "@software-factory/core";

import { markComment, readNote, stripMarker } from "../src/builder/protocol.ts";
import {
  aboutOf,
  heldArgs,
  isStuck,
  labelArgs,
  planOf,
  STUCK_LABEL,
  stuckArgs,
  typeEdit,
  typeOf,
  withPlan,
} from "../src/cards/cards.ts";

test("a card's type is a label: read from its labels, changed one for another", () => {
  assert.equal(typeOf(["factory", "type: bug"]), "bug");
  assert.equal(typeOf(["factory"]), null);
  assert.deepEqual(typeEdit(["type: bug"], "feature"), [
    "--add-label",
    "type: feature",
    "--remove-label",
    "type: bug",
  ]);
  assert.deepEqual(typeEdit(["type: bug"], null), [
    "--remove-label",
    "type: bug",
  ]);
  assert.deepEqual(typeEdit(["type: bug"], "bug"), []);
  assert.deepEqual(labelArgs("bug", ["--repo", "o/r"]).slice(0, 3), [
    "label",
    "create",
    "type: bug",
  ]);
});

test("a card the builder got stuck on carries the stuck label, made where there is none yet", () => {
  const repo = ["--repo", "o/r"];
  assert.equal(isStuck(["factory", STUCK_LABEL]), true);
  assert.equal(isStuck(["factory"]), false);
  assert.deepEqual(
    stuckArgs(7, ["factory"], true, repo).map((args) => args.slice(0, 3)),
    [
      ["label", "create", STUCK_LABEL],
      ["issue", "edit", "7"],
    ],
  );
  assert.deepEqual(stuckArgs(7, [STUCK_LABEL], true, repo), []);
  assert.deepEqual(stuckArgs(7, [STUCK_LABEL], false, repo), [
    ["issue", "edit", "7", ...repo, "--remove-label", STUCK_LABEL],
  ]);
  assert.deepEqual(stuckArgs(7, [], false, repo), []);
});

test("a card in a team's stage carries its label, made where there is none yet, and only one", () => {
  const repo = ["--repo", "o/r"];
  assert.deepEqual(heldArgs(7, ["type: bug"], "checklist", repo), [
    [
      "label",
      "create",
      "stage: checklist",
      ...repo,
      "--color",
      "8957e5",
      "--force",
    ],
    ["issue", "edit", "7", ...repo, "--add-label", "stage: checklist"],
  ]);
  assert.deepEqual(heldArgs(7, ["stage: checklist"], "checklist", repo), []);
  assert.deepEqual(heldArgs(7, ["stage: checklist"], "audit", repo).at(-1), [
    "issue",
    "edit",
    "7",
    ...repo,
    "--add-label",
    "stage: audit",
    "--remove-label",
    "stage: checklist",
  ]);
  assert.deepEqual(heldArgs(7, ["stage: checklist", "x"], null, repo), [
    ["issue", "edit", "7", ...repo, "--remove-label", "stage: checklist"],
  ]);
  assert.deepEqual(heldArgs(7, ["x"], null, repo), []);
});

test("what a card says it asks for leaves out what its piece of work keeps", () => {
  const body = withKept(withPlan("It asks for A.", "Do A."), {
    stage: "build",
    passed: [],
    history: [],
    parts: {},
  });
  assert.equal(aboutOf(body), "It asks for A.");
  assert.equal(planOf(body), "## The agreed plan\n\nDo A.");
});

test("an earlier factory's notes and plan are read too", () => {
  const old = "Building started.\n\n<!-- acme-factory:started -->";
  assert.equal(readNote(old), "started");
  assert.equal(stripMarker(old), "Building started.");
  assert.equal(readNote(markComment("Hi", "question")), "question");
  const body =
    "## Summary\nSome.\n\n## The agreed plan\nDo it.\n\n## Later\nNo.";
  assert.equal(planOf(body), "Do it.");
  assert.equal(aboutOf(body), "## Summary\nSome.");
  assert.equal(planOf("## The agreed plan\n"), null);
  const ours = withPlan("Ask.", "Plan.");
  assert.equal(planOf(ours), "## The agreed plan\n\nPlan.");
  assert.equal(aboutOf(ours), "Ask.");
});

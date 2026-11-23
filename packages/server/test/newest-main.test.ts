import assert from "node:assert/strict";
import { test } from "node:test";

import type { BoardCard } from "../src/extensions/factory/builder/decide.ts";
import { onNewestMain } from "../src/extensions/factory/builder/newest-main.ts";
import type { BuildCopy } from "../src/extensions/factory/builder/turn.ts";

// Right before the checks and the pull request, the newest main is brought
// into a built card's branch; a clash goes to the builder to settle, and
// what it cannot settle stops the card.

const CARD: BoardCard = {
  number: 7,
  title: "Export to CSV",
  url: "https://github.com/acme/shop/issues/7",
  body: "",
  stage: "doing",
  closed: false,
  agreedInText: true,
  waitsFor: [],
  thread: [],
  pullRequest: null,
  awaitsAnswer: false,
  stuck: false,
};

function copyThatClashes(clashes: string[]) {
  const done: string[] = [];
  const copy: BuildCopy = {
    path: "/copy",
    prepareSharedBranch: () => Promise.resolve(),
    heldElsewhere: () => Promise.resolve(null),
    bringInMain: () => {
      done.push("merge");
      return Promise.resolve(clashes);
    },
    clashing: () => Promise.resolve(clashes),
    abortMerge: () => {
      done.push("abort");
      return Promise.resolve();
    },
  };
  return { copy, done };
}

test("the newest main that goes in by itself needs nobody", async () => {
  const { copy, done } = copyThatClashes([]);
  const asked: string[] = [];
  const outcome = await onNewestMain(
    copy,
    (prompt) => {
      asked.push(prompt);
      return Promise.resolve({ status: "done", text: "" });
    },
    CARD,
    () => {},
  );
  assert.equal(outcome, null);
  assert.deepEqual(done, ["merge"]);
  assert.deepEqual(asked, []);
});

test("a clash with the newest main goes to the builder; one it cannot settle stops the card", async () => {
  const { copy, done } = copyThatClashes(["src/app.ts"]);
  const asked: string[] = [];
  const said: string[] = [];
  const settled = await onNewestMain(
    copy,
    (prompt) => {
      asked.push(prompt);
      return Promise.resolve({ status: "done", text: "Settled." });
    },
    CARD,
    (line) => said.push(line),
  );
  assert.equal(settled, null);
  assert.deepEqual(done, ["merge", "abort"]);
  assert.match(asked[0] ?? "", /bring the newest main into card #7/);
  assert.match(said[0] ?? "", /src\/app\.ts clash/);
  const stuck = await onNewestMain(
    copy,
    () =>
      Promise.resolve({ status: "blocked", text: "Both change the total." }),
    CARD,
    () => {},
  );
  assert.deepEqual(stuck, {
    passed: false,
    report: "",
    blocked: "Both change the total.",
  });
});

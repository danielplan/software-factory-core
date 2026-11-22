import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { run } from "@software-factory/core";

import type { WorkView } from "../src/api.ts";
import { markComment } from "../src/builder/protocol.ts";
import type { Cards, CardDetail } from "../src/cards/cards.ts";
import { cardLook, supportCards } from "../src/kobble/card-look.ts";
import { project } from "./builder-stage.ts";

// What Sprocket sees of a card: the card, its conversation and its branch;
// and that it sends an answer on only for a stuck card.

const detail = (number: number): CardDetail => ({
  number,
  title: "Big",
  stage: "backlog",
  column: "Backlog",
  url: `https://github.com/o/r/issues/${String(number)}`,
  labels: [],
  closed: false,
  waitsFor: [],
  body: "The plan.",
  agreed: true,
  comments: [
    {
      author: "danielplan",
      body: markComment("Which way, A or B?", "blocked"),
      at: "2026-01-01T10:00:00Z",
    },
    { author: "danielplan", body: "Hm, why?", at: "2026-01-01T11:00:00Z" },
  ],
  dependsOn: [],
  neededBy: [],
  kept: null,
});

const cards = { show: (n: number) => Promise.resolve(detail(n)) } as Cards;

test("Sprocket looks at a card: its text, its conversation, and its branch with the run file", async () => {
  const { source } = await project();
  const git = (...args: string[]) => run("git", ["-C", source, ...args]);
  await git("checkout", "--quiet", "-b", "factory/issue-7");
  mkdirSync(join(source, "runs"), { recursive: true });
  writeFileSync(
    join(source, "runs", "issue-7-big.md"),
    "# Run\n\nStep 1 done.",
  );
  writeFileSync(join(source, "app", "BIG.md"), "big");
  await git("add", ".");
  await git("commit", "--quiet", "-m", "#7 Step 1");
  await git("push", "--quiet", "origin", "factory/issue-7");
  await git("checkout", "--quiet", "main");

  const seen = await cardLook(7, cards, source, "2026-01-01T10:00:00Z");
  assert.match(seen, /# #7 Big/);
  assert.match(seen, /column: Backlog · stuck since 2026-01-01T10:00:00Z/);
  assert.match(
    seen,
    /### Kobble's builder, 2026-01-01T10:00:00Z\n\nWhich way, A or B\?\n/,
  );
  assert.match(seen, /### danielplan, 2026-01-01T11:00:00Z\n\nHm, why\?/);
  assert.doesNotMatch(seen, /software-factory:blocked/);
  assert.match(seen, /#7 Step 1/);
  assert.match(seen, /app\/BIG\.md/);
  assert.match(seen, /### runs\/issue-7-big\.md\n\n# Run\n\nStep 1 done\./);

  // Work not pushed is read from the factory's own branch.
  assert.match(seen, /on this computer, as the builder left it/);

  // A branch only where the code lives is fetched from there.
  await git("checkout", "--quiet", "-b", "factory/issue-9");
  writeFileSync(join(source, "app", "NINE.md"), "nine");
  await git("add", ".");
  await git("commit", "--quiet", "-m", "#9 Pushed");
  await git("push", "--quiet", "origin", "factory/issue-9");
  await git("checkout", "--quiet", "main");
  await git("branch", "--quiet", "-D", "factory/issue-9");
  const pushed = await cardLook(9, cards, source, null);
  assert.match(pushed, /\(as pushed; against/);
  assert.match(pushed, /app\/NINE\.md/);

  const none = await cardLook(8, cards, source, null);
  assert.match(none, /`factory\/issue-8` has nothing yet/);
  assert.doesNotMatch(none, /stuck since/);
});

test("Sprocket sends the team's answer on only for a stuck card", async () => {
  const sent: [number, string][] = [];
  const work = { stuck: [{ number: 7 }] } as unknown as WorkView;
  const on = supportCards({
    project: "/nowhere",
    cards: () => cards,
    work: () => work,
    answer: (number, text) => {
      sent.push([number, text]);
      return Promise.resolve();
    },
  });
  await assert.rejects(on.answer(8, "Go on"), /#8 is not stuck/);
  assert.match(await on.answer(7, "Take A."), /Sent on #7/);
  assert.deepEqual(sent, [[7, "Take A."]]);
});

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";

import { type Claude, run } from "@software-factory/core";

import { readNote } from "../src/builder/protocol.ts";
import { withPlan } from "../src/cards/cards.ts";
import {
  type Kept,
  pretendClaude,
  project,
  settled,
  setUp,
} from "./builder-stage.ts";

// The builder's lanes: several cards at once, the latest main brought into
// a card's branch, and Claude's usage limit as a pause.

test("with two cards at once, two agreed cards are built side by side, each in a copy of its own", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>([
    [
      4,
      {
        title: "First",
        stage: "todo",
        body: withPlan("One.", "Add ONE.md."),
        comments: [],
      },
    ],
    [
      5,
      {
        title: "Second",
        stage: "todo",
        body: withPlan("Two.", "Add TWO.md."),
        comments: [],
      },
    ],
  ]);
  const copies = new Set<string>();
  const { claude, prompts } = pretendClaude((options) => {
    copies.add(basename(options.cwd));
    writeFileSync(join(options.cwd, "app", `${basename(options.cwd)}.md`), "x");
    return "Built.\nSTATUS: done";
  });
  const { work, prs } = setUp(kept, claude, copy, [], 2);
  work.switch("build", true);
  await settled(work);
  assert.deepEqual(
    [...copies].sort((a, b) => a.localeCompare(b)),
    ["build", "build-2"],
  );
  assert.equal(prs.made.length, 2);
  assert.ok(prompts.some((p) => p.includes("Your working copy is `build-2`")));
  assert.equal(kept.get(4)?.stage, "review");
  assert.equal(kept.get(5)?.stage, "review");
});

async function clashingBranch() {
  const made = await project();
  const git = (...args: string[]) => run("git", ["-C", made.source, ...args]);
  await git("checkout", "--quiet", "-b", "factory/issue-6");
  writeFileSync(join(made.source, "app", "README.md"), "The card's app\n");
  await git("commit", "--quiet", "-am", "card");
  await git("push", "--quiet", "origin", "factory/issue-6");
  await git("checkout", "--quiet", "main");
  writeFileSync(join(made.source, "app", "README.md"), "Main's app\n");
  await git("commit", "--quiet", "-am", "main");
  await git("push", "--quiet", "origin", "main");
  const kept = new Map<number, Kept>([
    [
      6,
      {
        title: "Carry on",
        stage: "doing",
        body: withPlan("Go on.", "Change the README."),
        comments: [],
      },
    ],
  ]);
  return { ...made, kept };
}

test("main is brought into a card's branch; a clash goes to the builder, who settles it", async () => {
  const { copy, folder, kept } = await clashingBranch();
  const prompts: string[] = [];
  // Settles the clash the way a builder would: both sides, then the merge.
  const claude: Claude = {
    run: async (options) => {
      prompts.push(options.prompt);
      if (options.prompt.includes("bringing main in")) {
        writeFileSync(join(options.cwd, "app", "README.md"), "Both\n");
        await run("git", ["-C", options.cwd, "add", "app/README.md"]);
        await run(
          "git",
          ["-C", options.cwd, "commit", "--quiet", "--no-edit"],
          {
            env: { LEFTHOOK: "0" },
          },
        );
      }
      return { ok: true, text: "Settled and built.\nSTATUS: done" };
    },
  };
  const { work } = setUp(kept, claude, copy, []);
  work.switch("build", true);
  await settled(work);
  assert.ok(prompts[0]?.includes("- `app/README.md`"));
  const branch = await run("git", [
    "--git-dir",
    join(folder, "origin.git"),
    "show",
    "factory/issue-6:app/README.md",
  ]);
  assert.equal(branch, "Both\n");
  assert.equal(kept.get(6)?.stage, "review");
});

test("a clash the builder leaves unsettled stops the card with a question", async () => {
  const { copy, kept } = await clashingBranch();
  const { claude } = pretendClaude(() => "Done.\nSTATUS: done");
  const { work } = setUp(kept, claude, copy, []);
  work.switch("build", true);
  await settled(work);
  const last = kept.get(6)?.comments.at(-1)?.body ?? "";
  assert.equal(readNote(last), "blocked");
  assert.match(last, /clashed in `app\/README.md`/);
  assert.equal(kept.get(6)?.stage, "planning");
});

test("Claude's usage limit pauses the card where it is, and the lanes, until it resets", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>([
    [
      7,
      {
        title: "Late",
        stage: "todo",
        body: withPlan("Later.", "Add LATE.md."),
        comments: [],
      },
    ],
  ]);
  let tries = 0;
  const claude: Claude = {
    run: () => {
      tries++;
      return Promise.resolve({
        ok: false,
        text: "",
        error: "You've hit your session limit · resets 7:50pm (Europe/Rome)",
      });
    },
  };
  const { work } = setUp(kept, claude, copy, []);
  work.switch("build", true);
  await settled(work);
  await work.refresh();
  const last = kept.get(7)?.comments.at(-1)?.body ?? "";
  assert.equal(readNote(last), "paused");
  assert.match(last, /carries on with this card by itself/);
  assert.equal(kept.get(7)?.stage, "doing");
  assert.equal(tries, 1);
  assert.match(work.view().builder.problem ?? "", /^Paused until/);
});

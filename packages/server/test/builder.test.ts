import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { run } from "@software-factory/core";

import { markComment, readNote } from "../src/builder/protocol.ts";
import { withPlan } from "../src/cards/cards.ts";
import {
  type Kept,
  now,
  pretendClaude,
  project,
  settled,
  setUp,
} from "./builder-stage.ts";

test("the builder builds a card in To do: checks, one fix, a pull request, review", async () => {
  const { source, copy, folder } = await project();
  const kept = new Map<number, Kept>([
    [
      2,
      {
        title: "A greeting",
        stage: "todo",
        body: withPlan("Say hello.", "Add HELLO.md."),
        comments: [],
      },
    ],
    [
      4,
      { title: "Old", stage: "review", body: "", comments: [], closed: true },
    ],
  ]);
  const { claude, prompts } = pretendClaude((options) => {
    if (options.prompt.includes("make the checks pass")) {
      writeFileSync(join(options.cwd, "app", "FIX.md"), "fixed");
      return "Fixed the test.\nSTATUS: done";
    }
    if (options.prompt.includes("review comments")) {
      writeFileSync(join(options.cwd, "app", "HELLO.md"), "Hello, renamed");
      return "Renamed it.\nSTATUS: done";
    }
    writeFileSync(join(options.cwd, "app", "HELLO.md"), "Hello");
    return "Added a greeting. ![it](app/HELLO.md)\nSTATUS: done";
  });
  const { work, board, prs, checks } = setUp(kept, claude, copy, [false, true]);

  // Off, the board is only shown.
  await work.refresh();
  assert.deepEqual(
    work.view().cards.map((c) => c.number),
    [2, 4],
  );
  assert.equal(work.view().read, "1970-01-01T00:00:00.000Z");
  assert.deepEqual(board.said, []);

  work.switch("build", true);
  await settled(work);

  // The closed card is done.
  assert.equal(kept.get(4)?.stage, "done");
  // Built: the checks failed once, the builder fixed them, they passed.
  assert.deepEqual(checks, ["npm ci", "npm test", "npm ci", "npm test"]);
  assert.ok(prompts.some((p) => p.includes("1 test failed")));
  const card2 = kept.get(2);
  assert.equal(card2?.stage, "review");
  assert.deepEqual(
    card2.comments.map((c) => readNote(c.body)),
    ["started", "review-ready"],
  );
  const pr = prs.made[0];
  assert.equal(pr?.draft, false);
  assert.match(pr.body, /Closes #2\./);
  assert.match(pr.body, /blob\/factory\/issue-2\/app\/HELLO\.md/);
  const pushed = await run("git", [
    "-C",
    source,
    "show",
    "origin/factory/issue-2:app/HELLO.md",
  ]).catch(async () => {
    await run("git", ["-C", source, "fetch", "--quiet", "origin"]);
    return run("git", [
      "-C",
      source,
      "show",
      "origin/factory/issue-2:app/HELLO.md",
    ]);
  });
  assert.equal(pushed, "Hello");

  // The card shows its pull request; the builder kept its steps.
  await work.refresh();
  assert.equal(
    work.view().cards.find((c) => c.number === 2)?.pullRequest,
    pr.url,
  );
  assert.deepEqual(work.view().builder.steps, []);

  // A review comment is answered on the same branch.
  pr.thread.push({
    author: "owner",
    body: "Rename it",
    at: now(),
    where: "pull request",
  });
  await work.refresh();
  await settled(work);
  assert.equal(readNote(pr.thread.at(-1)?.body ?? ""), "fixed");
  assert.match(pr.thread.at(-1)?.body ?? "", /Renamed it/);
  assert.match(
    await run("git", [
      "-C",
      join(folder, "copies", "build"),
      "show",
      "HEAD:app/HELLO.md",
    ]),
    /renamed/,
  );
  work.stop();
});

test("when the builder gives up, its work goes up as a draft and the card waits; a question waits in To do for the answer", async () => {
  const { copy } = await project();
  const plan = withPlan("", "The plan.");
  const kept = new Map<number, Kept>([
    [5, { title: "Red", stage: "todo", body: plan, comments: [] }],
  ]);
  let answer: string | null = "Built.\nSTATUS: done";
  const { claude, prompts } = pretendClaude((options) => {
    writeFileSync(join(options.cwd, "app", "RED.md"), now());
    return answer;
  });
  const { work, prs, checks } = setUp(kept, claude, copy, [
    false,
    false,
    false,
    false,
  ]);
  const card = kept.get(5);
  assert.ok(card);
  const last = () => card.comments.at(-1)?.body ?? "";
  const owner = (body: string) =>
    card.comments.push({ author: "owner", body, at: now(), where: "card" });
  work.switch("build", true);
  await settled(work);
  // Checked, then three rounds of fixing, each checked again: still red, so
  // a draft that says what fails, and the card waits in In progress.
  assert.equal(checks.filter((c) => c === "npm test").length, 4);
  assert.ok(prompts.some((p) => p.includes("(round 3 of 3)")));
  assert.equal(prs.made.length, 1);
  assert.equal(prs.made[0]?.draft, true);
  assert.match(prs.made[0].body, /## The checks fail[\s\S]*1 test failed/);
  assert.equal(card.stage, "doing");
  assert.equal(readNote(last()), "checks-failed");
  assert.match(last(), /draft pull request, not to merge yet/);
  await work.refresh();
  await settled(work);
  assert.equal(checks.filter((c) => c === "npm test").length, 4);

  // The owner's hint lets it try again; this time it asks a question.
  answer = "Which colour?\nSTATUS: blocked";
  owner("Try again");
  await work.refresh();
  await settled(work);
  assert.equal(card.stage, "todo");
  assert.equal(readNote(last()), "blocked");
  // Not answered yet: it waits.
  await work.refresh();
  await settled(work);
  assert.equal(card.stage, "todo");

  // Answered: Claude Code cannot start. It gives up, with the draft of
  // what is there, and waits for a comment.
  answer = null;
  owner("Blue");
  await work.refresh();
  await settled(work);
  assert.equal(card.stage, "doing");
  assert.equal(readNote(last()), "failed");
  assert.match(last(), /The build stopped: spawn claude ENOENT/);
  assert.match(last(), /pull\/100/);

  // A comment lets it go on; an answer that never says how it ended gives
  // up the same way, after it was told twice to carry on.
  answer = "I did something";
  owner("Go on");
  await work.refresh();
  await settled(work);
  assert.equal(card.stage, "doing");
  assert.match(last(), /stopped 3 times without finishing/);
  work.switch("build", false);
  assert.equal(work.view().builder.on, false);
});

test("a board that cannot be read says why", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>();
  const { claude } = pretendClaude(() => null);
  const { work, board } = setUp(kept, claude, copy, []);
  assert.match(markComment("x", "failed"), /failed/);

  board.cards.list = () => Promise.reject(new Error("GitHub is away"));
  await work.refresh();
  assert.equal(work.view().problem, "GitHub is away");
  work.start();
  work.stop();
});

test("a red check only the owner can fix becomes a question in the card", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>([
    [
      7,
      {
        title: "Key",
        stage: "todo",
        body: withPlan("", "The plan."),
        comments: [],
      },
    ],
  ]);
  const { claude } = pretendClaude((options) => {
    writeFileSync(join(options.cwd, "app", "KEY.md"), "x");
    return options.prompt.includes("make the checks pass")
      ? "The tests need the payment provider's key.\nSTATUS: blocked"
      : "Built.\nSTATUS: done";
  });
  const { work, prs } = setUp(kept, claude, copy, [false]);
  work.switch("build", true);
  await settled(work);
  assert.equal(prs.made.length, 0);
  assert.equal(kept.get(7)?.stage, "todo");
  const said = kept.get(7)?.comments.at(-1)?.body ?? "";
  assert.equal(readNote(said), "blocked");
  assert.match(said, /payment provider's key/);
});

test("a builder that stops halfway is told to carry on in the same conversation", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>([
    [
      8,
      {
        title: "Half",
        stage: "todo",
        body: withPlan("", "The plan."),
        comments: [],
      },
    ],
  ]);
  const sessions: { id: string; resume: boolean }[] = [];
  const { claude, prompts } = pretendClaude((options) => {
    if (options.session) sessions.push(options.session);
    writeFileSync(join(options.cwd, "app", "HALF.md"), String(sessions.length));
    return sessions.length === 1
      ? "The suite is still running; I'll look at it when it is done."
      : "Built and checked.\nSTATUS: done";
  });
  const { work } = setUp(kept, claude, copy, []);
  work.switch("build", true);
  await settled(work);
  assert.equal(kept.get(8)?.stage, "review");
  assert.equal(sessions[1]?.resume, true);
  assert.equal(sessions[1].id, sessions[0]?.id);
  assert.match(prompts[1] ?? "", /nothing you started keeps running/);
});

test("a builder that is not finished but not blocked goes on in the next session, without asking", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>([
    [
      9,
      {
        title: "Big",
        stage: "todo",
        body: withPlan("", "The plan."),
        comments: [],
      },
    ],
  ]);
  let session = 0;
  const { claude, prompts } = pretendClaude((options) => {
    session++;
    writeFileSync(join(options.cwd, "app", "BIG.md"), String(session));
    return session < 4
      ? `Step ${String(session)} is built.\nSTATUS: continue`
      : "Everything is built and checked.\nSTATUS: done";
  });
  const { work, prs } = setUp(kept, claude, copy, []);
  work.switch("build", true);
  await settled(work);
  const card = kept.get(9);
  assert.ok(card);
  const notes = card.comments.map((c) => readNote(c.body));
  assert.equal(session, 4);
  assert.equal(card.stage, "review");
  assert.equal(prs.made.length, 1);
  assert.equal(prs.made[0]?.draft, false);
  // Told once that it started, once how far it is (after three sessions),
  // never asked a question.
  assert.equal(notes.filter((n) => n === "progress").length, 1);
  assert.equal(notes.includes("blocked"), false);
  assert.match(prompts[1] ?? "", /earlier work on this branch exists/);
  work.switch("build", false);
});

test("a builder that says it is not finished but adds nothing twice in a row is stopped with a draft", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>([
    [
      11,
      {
        title: "Stuck",
        stage: "todo",
        body: withPlan("", "The plan."),
        comments: [],
      },
    ],
  ]);
  let session = 0;
  const { claude } = pretendClaude((options) => {
    session++;
    // Only the first session changes something.
    if (session === 1)
      writeFileSync(join(options.cwd, "app", "STUCK.md"), "one");
    return "More to do.\nSTATUS: continue";
  });
  const { work } = setUp(kept, claude, copy, []);
  work.switch("build", true);
  await settled(work);
  const card = kept.get(11);
  assert.ok(card);
  // Session 1 adds a commit, 2 and 3 add none.
  assert.equal(session, 3);
  assert.equal(card.stage, "doing");
  assert.equal(readNote(card.comments.at(-1)?.body ?? ""), "failed");
  assert.match(card.comments.at(-1)?.body ?? "", /added nothing/);
  work.switch("build", false);
});

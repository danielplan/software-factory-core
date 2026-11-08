import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  type Claude,
  defineKit,
  type RunOptions,
  run,
  Workspace,
} from "@software-factory/core";

import type { Stage } from "../src/api.ts";
import { BoardWork } from "../src/builder/board-work.ts";
import { Jobs } from "../src/builder/jobs.ts";
import type { Message } from "../src/builder/decide.ts";
import { markComment, readNote } from "../src/builder/protocol.ts";
import type {
  PullRequest,
  PullRequests,
} from "../src/builder/pull-requests.ts";
import { type Card, type Cards, planOf, withPlan } from "../src/cards/cards.ts";

// The builder and the coach working a board: GitHub's board and pull
// requests are stand-ins that remember what they were told, Claude Code is
// a pretend one, the checks a pretend shell; the git copies are real.

process.env.GIT_AUTHOR_NAME = "t";
process.env.GIT_AUTHOR_EMAIL = "t@t";
process.env.GIT_COMMITTER_NAME = "t";
process.env.GIT_COMMITTER_EMAIL = "t@t";

const kit = defineKit({
  id: "web-kit",
  name: "Web kit",
  about: "A stand-in.",
  kind: "web-app",
  commands: { verify: "npm test" },
});
const available = { kits: [kit], extensions: [] };

async function project() {
  const folder = mkdtempSync(join(tmpdir(), "builder-"));
  const source = join(folder, "project");
  await run("git", ["init", "--quiet", "--bare", join(folder, "origin.git")]);
  await run("git", ["init", "--quiet", "-b", "main", source]);
  const write = (path: string, text: string) => {
    mkdirSync(join(source, path, ".."), { recursive: true });
    writeFileSync(join(source, path), text);
  };
  write(
    "factory/factory.json",
    JSON.stringify({
      name: "Co",
      about: "A test.",
      tracker: "github",
      kits: ["web-kit"],
      extensions: [],
    }),
  );
  write(
    "factory/products/app/product.json",
    JSON.stringify({
      id: "app",
      name: "App",
      kind: "web-app",
      code: "../../../app",
      about: "The app.",
    }),
  );
  write("app/README.md", "The app\n");
  writeFileSync(join(source, ".gitignore"), "node_modules\n");
  writeFileSync(join(source, "app", "package-lock.json"), "{}");
  const git = (...args: string[]) => run("git", ["-C", source, ...args]);
  await git("add", ".");
  await git("commit", "--quiet", "-m", "start");
  await git("remote", "add", "origin", join(folder, "origin.git"));
  await git("push", "--quiet", "origin", "main");
  const copy = (name: string) =>
    Promise.resolve(
      new Workspace(
        { source, workspaces: join(folder, "copies"), baseBranch: "main" },
        name,
      ),
    );
  return { folder, source, copy };
}

let clock = 0;
const now = () =>
  `2026-01-01T00:${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock++ % 60).padStart(2, "0")}Z`;

type Kept = {
  title: string;
  stage: Stage;
  body: string;
  comments: Message[];
  closed?: boolean;
};

function pretendBoard(kept: Map<number, Kept>) {
  const said: string[] = [];
  const cards: Cards = {
    list: () =>
      Promise.resolve(
        [...kept].map(([number, c]): Card => ({
          number,
          title: c.title,
          stage: c.stage,
          column: c.stage,
          url: `https://github.com/o/r/issues/${String(number)}`,
          labels: [],
          closed: c.closed ?? false,
          waitsFor: [],
        })),
      ),
    show: async (number) => {
      const [card] = (await cards.list()).filter((c) => c.number === number);
      const c = kept.get(number);
      if (!card || !c) throw new Error("no card");
      return {
        ...card,
        body: c.body,
        agreed: planOf(c.body) !== null,
        comments: c.comments,
        dependsOn: [],
        neededBy: [],
      };
    },
    move: (number, stage) => {
      const c = kept.get(number);
      if (c) c.stage = stage;
      said.push(`#${String(number)} → ${stage}`);
      return Promise.resolve();
    },
    comment: (number, text) => {
      kept
        .get(number)
        ?.comments.push({ author: "me", body: text, at: now(), where: "card" });
      return Promise.resolve();
    },
    create: () => Promise.reject(new Error("not here")),
    dependOn: () => Promise.reject(new Error("not here")),
    replace: () => Promise.reject(new Error("not here")),
    writePlan: (number, plan) => {
      const c = kept.get(number);
      if (c) c.body = withPlan(c.body, plan);
      return Promise.resolve();
    },
  };
  return { cards, said };
}

function pretendPullRequests() {
  const made: (PullRequest & {
    branch: string;
    body: string;
    thread: Message[];
  })[] = [];
  const pullRequests: PullRequests = {
    baseBranch: () => Promise.resolve("main"),
    find: (branch) =>
      Promise.resolve(made.find((p) => p.branch === branch) ?? null),
    open: (o) => {
      const pr = {
        number: 100 + made.length,
        url: `https://github.com/o/r/pull/${String(100 + made.length)}`,
        state: "OPEN" as const,
        draft: o.draft,
        branch: o.branch,
        body: o.body,
        thread: [],
      };
      made.push(pr);
      return Promise.resolve(pr);
    },
    update: (number, body, draft) => {
      const pr = made.find((p) => p.number === number);
      if (pr) Object.assign(pr, { body, draft });
      return Promise.resolve();
    },
    comment: (number, text) => {
      made
        .find((p) => p.number === number)
        ?.thread.push({
          author: "me",
          body: text,
          at: now(),
          where: "pull request",
        });
      return Promise.resolve();
    },
    said: (number) =>
      Promise.resolve(made.find((p) => p.number === number)?.thread ?? []),
  };
  return { pullRequests, made };
}

// Each turn: what it writes in its folder, and its answer.
function pretendClaude(turn: (options: RunOptions) => string | null) {
  const prompts: string[] = [];
  const claude: Claude = {
    run: (options) => {
      prompts.push(options.prompt);
      options.onActivity("Reading");
      const text = turn(options);
      return Promise.resolve(
        text === null
          ? { ok: false, text: "", error: "spawn claude ENOENT" }
          : { ok: true, text },
      );
    },
  };
  return { claude, prompts };
}

async function settled(work: BoardWork) {
  for (let i = 0; i < 400; i++) {
    await new Promise((done) => setTimeout(done, 25));
    const view = work.view();
    if (!view.builder.working && view.coach.working === null) {
      await work.refresh();
      const again = work.view();
      if (!again.builder.working && again.coach.working === null) return;
    }
  }
  throw new Error("The work did not settle.");
}

function setUp(
  kept: Map<number, Kept>,
  claude: Claude,
  copy: (n: string) => Promise<Workspace>,
  shellOk: boolean[],
) {
  const board = pretendBoard(kept);
  const prs = pretendPullRequests();
  const checks: string[] = [];
  const jobs = new Jobs({
    cards: board.cards,
    pullRequests: prs.pullRequests,
    claude,
    repository: "o/r",
    available,
    copies: { chat: () => copy("chat"), build: () => copy("build") },
    shell: (cwd, command) => {
      checks.push(command);
      if (command === "npm ci")
        return Promise.resolve({ ok: true, output: "" });
      return Promise.resolve({
        ok: shellOk.shift() ?? true,
        output: "1 test failed\nexpected 2",
      });
    },
  });
  const work = new BoardWork({
    cards: board.cards,
    pullRequests: prs.pullRequests,
    jobs,
    onChange: () => undefined,
    now: () => new Date(0),
  });
  return { work, board, prs, checks };
}

test("the coach plans in a card, the builder builds an agreed one: checks, one fix, a pull request, review", async () => {
  const { source, copy, folder } = await project();
  const kept = new Map<number, Kept>([
    [
      1,
      {
        title: "Invoices in euros",
        stage: "planning",
        body: "Invoices should be in euros.",
        comments: [
          {
            author: "owner",
            body: "Can you plan this?",
            at: now(),
            where: "card",
          },
        ],
      },
    ],
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
      3,
      { title: "Not planned", stage: "todo", body: "Something", comments: [] },
    ],
    [
      4,
      { title: "Old", stage: "review", body: "", comments: [], closed: true },
    ],
  ]);
  const { claude, prompts } = pretendClaude((options) => {
    if (options.readOnly) return "Plan: euros everywhere.\nSTATUS: plan-agreed";
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
    [1, 2, 3, 4],
  );
  assert.equal(work.view().read, "1970-01-01T00:00:00.000Z");
  assert.deepEqual(board.said, []);

  work.switch("chat", true);
  work.switch("build", true);
  await settled(work);

  // The coach's agreed plan is written into the card.
  assert.match(kept.get(1)?.body ?? "", /euros everywhere/);
  assert.equal(
    readNote(kept.get(1)?.comments.at(-1)?.body ?? ""),
    "plan-agreed",
  );
  // Without a plan, back to Planning; the closed card is done.
  assert.equal(kept.get(3)?.stage, "planning");
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

test("when the builder gives up, its work goes up as a draft and the card waits; a question goes back to Planning", async () => {
  const { copy } = await project();
  const plan = withPlan("", "The plan.");
  const kept = new Map<number, Kept>([
    [5, { title: "Red", stage: "todo", body: plan, comments: [] }],
  ]);
  let answer: string | null = "Built.\nSTATUS: done";
  const { claude, prompts } = pretendClaude((options) => {
    writeFileSync(join(options.cwd, "app", "RED.md"), String(clock));
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
  assert.equal(card.stage, "planning");
  assert.equal(readNote(last()), "blocked");

  // Answered and back in Ready: Claude Code cannot start. It gives up,
  // with the draft of what is there, and waits for a comment.
  answer = null;
  owner("Blue");
  card.stage = "todo";
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

test("a board that cannot be read says why; a coach that cannot start says so in the card", async () => {
  const { copy } = await project();
  const kept = new Map<number, Kept>([
    [6, { title: "Ask", stage: "planning", body: "", comments: [] }],
  ]);
  const { claude } = pretendClaude(() => null);
  const { work, board } = setUp(kept, claude, copy, []);
  work.switch("chat", true);
  await settled(work);
  assert.equal(readNote(kept.get(6)?.comments.at(-1)?.body ?? ""), "failed");
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
  assert.equal(kept.get(7)?.stage, "planning");
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

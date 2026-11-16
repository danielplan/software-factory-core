import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { type Claude, readSeed } from "@software-factory/core";

import type { Cli } from "../src/add-ons/github/github.ts";
import { fixMarkIn, titleOf } from "../src/build/answer.ts";
import { heardSince, seenPrompt } from "../src/build/seen.ts";
import { type BuildView, waitingForAnswer } from "../src/build/views.ts";
import { BoardWork } from "../src/builder/board-work.ts";
import type { Jobs } from "../src/builder/jobs.ts";
import type { PullRequests } from "../src/builder/pull-requests.ts";
import { readNote } from "../src/builder/protocol.ts";
import type { Card, Cards } from "../src/cards/cards.ts";
import type { RecordsView, StoryPage } from "../src/records/views.ts";
import { ACME_SEED, acmeServed } from "./acme-served.ts";
import { inGit } from "./git-project.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { BOARD, pretendGitHub } from "./pretend-github.ts";
import { stage } from "./stage.ts";

// Build's loop on the example company's records: the issues Kobble knows
// beside the board, "did it work?" with the kobold's draft of what was seen
// (a pretend Claude Code, or none), the answer saved and said on the issue
// (a stand-in GitHub), where the problem and the idea then stand, a fix
// ticket from a signal sent to Build, and the board's cards asking.

const seed = readSeed(ACME_SEED);
const today = new Date().toISOString().slice(0, 10);

async function building(claude: Claude, cli: Cli, board = true) {
  const staged = await stage(
    claude,
    {},
    { cli, fetcher: () => Promise.reject(new Error("offline")) },
  );
  const served = acmeServed(staged);
  if (board) {
    const file = join(served.root, "factory.json");
    const company = JSON.parse(readFileSync(file, "utf8")) as object;
    writeFileSync(file, JSON.stringify({ ...company, tracker: "github" }));
    writeFileSync(
      join(served.root, "board.json"),
      JSON.stringify({ github: BOARD }),
    );
  }
  inGit(staged.project, "Pia");
  return served;
}

type Answered = {
  outcome: { worked: string; by: string; on: string; seen: unknown };
  said: string;
  problem: string | null;
};
type Draft = { draft: string; heard: number; problem: string | null };

test("Build lists the issues Kobble knows: kind, what each is for or comes from, and the answers", async () => {
  const github = pretendGitHub();
  const factory = await building(pretendClaude([]).claude, github.cli);
  try {
    const view = await factory.read<BuildView>("/api/build");
    const ticket = (issue: number) =>
      view.tickets.find((t) => t.issue === issue);
    assert.deepEqual(ticket(131), {
      issue: 131,
      kind: "idea",
      label: "Idea · B",
      idea: {
        id: "monday",
        title: "Monday order list",
        weThink: seed.ideas.find((i) => i.id === "monday")?.weThink,
      },
      for: [
        {
          id: "copy",
          title: "Has to type last week’s order again",
          persona: "bruno",
          story: "st4",
        },
      ],
      from: null,
      since: "",
      outcome: null,
    });
    assert.deepEqual(
      [ticket(140)?.label, ticket(140)?.from, ticket(140)?.for],
      ["Fix", "Errors", []],
    );
    assert.equal(ticket(143)?.label, "Update");
    assert.deepEqual(ticket(127)?.outcome, {
      worked: "yes",
      by: "Luca",
      on: "14 Nov",
    });
    assert.deepEqual(view.waiting, []);
    // Only an idea's ticket with no answer yet asks.
    assert.deepEqual(
      [...waitingForAnswer(seed)].sort((a, b) => a - b),
      [131, 135, 138, 144],
    );
  } finally {
    factory.close();
  }
});

test("did it work? The kobold drafts what was seen; yes solves the problem, ends the story and says so on the issue", async () => {
  const github = pretendGitHub();
  const kobold = pretendClaude([
    {
      calls: [],
      reply: "Café Nord reordered in one tap on Monday.",
    },
  ]);
  const factory = await building(kobold.claude, github.cli);
  try {
    const drafted = await factory.send("/api/build/draft", { issue: 131 });
    assert.deepEqual(drafted.body, {
      draft: "Café Nord reordered in one tap on Monday.",
      heard: 1,
      problem: null,
    });
    const asked = kobold.seen[0];
    assert.match(asked?.prompt ?? "", /issue #131/);
    assert.match(asked?.prompt ?? "", /Has to type last week’s order again/);
    assert.match(asked?.prompt ?? "", /Support, Oct:/);
    assert.match(asked?.instructions ?? "", /did it work\?/);
    assert.equal(asked?.readOnly, true);
    const jobs = await factory.settled();
    assert.deepEqual(
      [jobs[0]?.kind, jobs[0]?.about, jobs[0]?.done],
      ["seen", "131", "Drafted what was seen."],
    );

    // Before the answer, its problem is being built (no board here says
    // the issue is in the app).
    const st4 = () => factory.read<StoryPage>("/api/understand/story?id=st4");
    const before = await st4();
    assert.deepEqual([before.stage, before.answer], ["building", null]);
    const answered = await factory.send("/api/build/answer", {
      issue: 131,
      worked: "yes",
      seen: "  Café Nord reordered in one tap.  ",
    });
    assert.deepEqual(answered.body, {
      outcome: {
        issue: 131,
        worked: "yes",
        seen: { text: "Café Nord reordered in one tap.", source: "sup" },
        by: "Pia",
        on: today,
      },
      said: "Marked solved in Understand.",
      problem: null,
    });
    const comment = github.said.at(-1) ?? "";
    assert.match(
      comment,
      /^#131: \*\*Did it work\?\*\* Yes, the problem is solved\./,
    );
    assert.match(comment, /\*\*Seen:\*\* Café Nord reordered in one tap\./);
    assert.equal(readNote(comment), "did-it-work");

    const { derived } = await factory.read<RecordsView>("/api/records");
    assert.equal(derived.problems.copy, "solved");
    const after = await st4();
    assert.deepEqual(
      [after.stage, after.answer],
      ["solved", { issue: 131, worked: "yes", by: "Pia", on: today }],
    );
    assert.equal(derived.stories.st4?.ended, true);
    assert.equal(derived.ideas.monday, "worked");
    const view = await factory.read<BuildView>("/api/build");
    assert.equal(
      view.tickets.find((t) => t.issue === 131)?.outcome?.worked,
      "yes",
    );

    const again = await factory.send("/api/build/answer", {
      issue: 131,
      worked: "no",
    });
    assert.match(again.body.error, /has its answer already/);
    const fix = await factory.send("/api/build/answer", {
      issue: 140,
      worked: "yes",
    });
    assert.match(fix.body.error, /A fix is for no problem/);
    const unknown = await factory.send("/api/build/answer", {
      issue: 7,
      worked: "yes",
    });
    assert.match(unknown.body.error, /knows no issue #7/);
    const wrong = await factory.send("/api/build/answer", {
      issue: 138,
      worked: "maybe",
    });
    assert.match(wrong.body.error, /This answer does not fit/);
    const noDraft = await factory.send("/api/build/draft", { issue: 140 });
    assert.match(noDraft.body.error, /Say which idea's issue/);
  } finally {
    factory.close();
  }
});

test("no leaves the problem open and the idea didn't work; without Claude Code or a board, the answer still goes in", async () => {
  const github = pretendGitHub();
  const factory = await building(pretendClaude([]).claude, github.cli, false);
  try {
    const drafted = await factory.send("/api/build/draft", { issue: 138 });
    const draft = drafted.body as unknown as Draft;
    assert.equal(draft.draft, "");
    assert.equal(draft.heard, 2);
    assert.match(draft.problem ?? "", /Claude Code is not on this computer/);

    const no = await factory.send("/api/build/answer", {
      issue: 138,
      worked: "no",
    });
    const answered = no.body as unknown as Answered;
    assert.equal(
      answered.said,
      "The problem stays open. Try another version in Explore.",
    );
    assert.equal(answered.outcome.seen, null);
    assert.match(
      answered.problem ?? "",
      /The answer is saved, but the comment on #138/,
    );
    const unchecked = await factory.send("/api/build/answer", {
      issue: 135,
      worked: "unchecked",
      seen: "Nobody looked.",
    });
    assert.equal(
      (unchecked.body as unknown as Answered).said,
      "Saved as not checked.",
    );
    const { derived } = await factory.read<RecordsView>("/api/records");
    assert.equal(derived.problems.when, "open");
    assert.equal(derived.ideas.tracking, "didntWork");
    assert.equal(derived.problems.size, "beingSolved");
    assert.equal(derived.stories.st8?.ended, false);
  } finally {
    factory.close();
  }
});

test("a bug sent to Build gets a fix ticket: an issue with the signal in a hidden mark, and no did it work?", async () => {
  const github = pretendGitHub();
  const factory = await building(pretendClaude([]).claude, github.cli);
  try {
    const notYet = await factory.send("/api/build/fix", { signal: "s17" });
    assert.match(notYet.body.error, /Only a bug or an update sent to Build/);
    await factory.send("/api/understand/move", {
      signal: "s17",
      to: { to: "build" },
    });
    const before = await factory.read<BuildView>("/api/build");
    assert.deepEqual(
      before.waiting.map((w) => [w.signal, w.kind]),
      [["s17", "fix"]],
    );

    const made = await factory.send("/api/build/fix", { signal: "s17" });
    assert.deepEqual(made.body, {
      issue: 9,
      url: "https://github.com/acme/shop/issues/9",
    });
    const issue = github.issues.get(9);
    const s17 = seed.signals.find((s) => s.id === "s17");
    assert.equal(issue?.title, titleOf(s17?.text ?? ""));
    assert.equal(fixMarkIn(issue.body), "s17");
    assert.match(issue.body, /Made in Kobble by Pia\./);
    assert.equal(fixMarkIn("No mark."), null);

    const { records } = await factory.read<RecordsView>("/api/records");
    assert.deepEqual(
      records.ticketLinks.find((t) => t.issue === 9),
      {
        issue: 9,
        kind: "fix",
        from: { signal: "s17" },
        problems: [],
        on: today,
      },
    );
    assert.deepEqual(records.signals.find((s) => s.id === "s17")?.wentTo, {
      to: "ticket",
      issue: 9,
    });
    const after = await factory.read<BuildView>("/api/build");
    assert.deepEqual(after.waiting, []);
    assert.ok(!waitingForAnswer(records).has(9));
    const missing = await factory.send("/api/build/fix", { signal: "nope" });
    assert.match(missing.body.error, /There is no signal “nope”/);
  } finally {
    factory.close();
  }
});

test("what was heard since a ticket: dated signals before it are left out, others are kept for the kobold", () => {
  const link = {
    issue: 5,
    kind: "idea" as const,
    from: { idea: "monday", version: "B" },
    problems: ["copy"],
    on: "2026-11-10",
  };
  const signal = (id: string, when: string) => ({
    ...seed.signals.find((s) => s.id === "s10"),
    id,
    when,
  });
  const records = {
    ...seed,
    signals: [
      ...seed.signals.filter((s) => s.id !== "s10"),
      signal("s10", "2026-11-01"),
      signal("later", "2026-11-12 08:00"),
      signal("vague", "Monday"),
    ] as typeof seed.signals,
  };
  assert.deepEqual(
    heardSince(records, link).map((s) => s.id),
    ["later", "vague"],
  );
  assert.deepEqual(
    heardSince(records, { ...link, on: "" }).map((s) => s.id),
    ["s10", "later", "vague"],
  );
  const prompt = seenPrompt(records, link, heardSince(records, link));
  assert.match(prompt, /went to Build on 2026-11-10/);
  assert.match(prompt, /The team thought: With last week/);
  assert.match(prompt, /- Support, Monday:/);
  assert.match(
    seenPrompt(records, { ...link, on: "" }, []),
    /on a day not known/,
  );
});

test("an issue's title is the first sentence of what came in, without quotes, kept short", () => {
  assert.equal(titleOf("“Checkout froze. Twice!”"), "Checkout froze.");
  assert.equal(titleOf("No end mark"), "No end mark");
  const long = `${"word ".repeat(30)}end.`;
  assert.ok(titleOf(long).endsWith("…"));
  assert.ok(titleOf(long).length <= 81);
  assert.equal(titleOf("x".repeat(90)).length, 81);
});

test("the board's cards ask did it work? while Kobble waits, and stop once answered", async () => {
  const listed: Card[] = [
    card(1, "done", true),
    card(2, "review", false),
    card(3, "backlog", false),
  ];
  const moved: number[] = [];
  const cards = {
    list: () => Promise.resolve(listed),
    show: (number: number) =>
      Promise.resolve({
        ...card(number, "review", false),
        body: "",
        agreed: false,
        comments: [],
        dependsOn: [],
        neededBy: [],
      }),
    move: (number: number) => {
      moved.push(number);
      return Promise.resolve();
    },
  } as unknown as Cards;
  const merged = {
    find: () =>
      Promise.resolve({ number: 4, url: "pr", state: "MERGED", draft: false }),
    said: () => Promise.resolve([]),
  } as unknown as PullRequests;
  let waiting = new Set([1, 2]);
  const work = new BoardWork({
    cards,
    pullRequests: merged,
    jobs: { run: () => Promise.resolve() } as unknown as Jobs,
    onChange: () => undefined,
    waiting: () => waiting,
  });
  // Read with the builder off: only closed or Done cards ask.
  await work.refresh();
  assert.deepEqual(asking(work), [1]);
  // With the builder on, a merged pull request asks too, and goes to Done.
  work.switch("build", true);
  await work.refresh();
  assert.equal(work.view().problem, null);
  assert.deepEqual(asking(work), [1, 2]);
  assert.ok(moved.includes(2));
  // Once answered, it asks no more.
  waiting = new Set([2]);
  assert.deepEqual(asking(work), [2]);
  assert.equal(work.view().cards[0]?.closed, true);
  work.switch("build", false);
  work.stop();
});

function card(number: number, stage: Card["stage"], closed: boolean): Card {
  return {
    number,
    title: `Card ${String(number)}`,
    stage,
    column: "",
    url: "",
    labels: [],
    closed,
    waitsFor: [],
  };
}

function asking(work: BoardWork): number[] {
  return work
    .view()
    .cards.filter((c) => c.asks)
    .map((c) => c.number);
}

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Claude } from "@software-factory/core";

import type { Cli } from "../src/add-ons/github/github.ts";
import { githubAddOn } from "../src/add-ons/github/index.ts";
import { realShell, runChecks, shownOutput } from "../src/builder/checks.ts";
import { ConnectedWork, workFor } from "../src/builder/connect-work.ts";
import type { BoardCard } from "../src/builder/decide.ts";
import { readNote } from "../src/builder/protocol.ts";
import {
  githubPullRequests,
  openOrUpdate,
  type PullRequests,
  RESOLVE_ASK,
} from "../src/builder/pull-requests.ts";
import { SeenPullRequests } from "../src/builder/seen-pull-requests.ts";

// The builder's pull requests through the GitHub CLI (a stand-in that
// answers what GitHub would and remembers what it was asked), the checks
// through the system's shell, and the board work put together from a
// factory's files.

function pretendCli(answers: Record<string, unknown>) {
  const asked: string[][] = [];
  const cli: Cli = {
    run: (args) => {
      asked.push(args);
      const key = Object.keys(answers).find((k) =>
        args.join(" ").startsWith(k),
      );
      const out = key === undefined ? "" : answers[key];
      if (out instanceof Error)
        return Promise.resolve({ code: 1, out: "", err: out.message });
      return Promise.resolve({
        code: 0,
        out: typeof out === "string" ? out : JSON.stringify(out),
        err: "",
      });
    },
    start: () => ({ answer: () => undefined, done: Promise.resolve(0) }),
  };
  return { cli, asked };
}

test("pull requests: found by branch, opened as a draft, updated, commented, and what was said", async () => {
  const { cli, asked } = pretendCli({
    "repo view": "trunk\n",
    "pr list": [
      {
        number: 7,
        url: "https://x/pull/7",
        state: "OPEN",
        isDraft: true,
        mergeable: "CONFLICTING",
      },
    ],
    "pr view": {
      comments: [
        { author: { login: "owner" }, body: "Later", createdAt: "2026-01-03" },
      ],
      reviews: [
        { author: null, body: "", submittedAt: "2026-01-01" },
        {
          author: { login: "owner" },
          body: "Looks good",
          submittedAt: "2026-01-02",
        },
      ],
    },
    "api repos/o/r/pulls/7/comments": [
      {
        user: { login: "owner" },
        body: "Rename",
        created_at: "2026-01-01",
        path: "a.ts",
      },
      { user: null, body: "Hm", created_at: "2026-01-04" },
    ],
    "pr ready": new Error("already ready"),
  });
  const prs = githubPullRequests(cli, "o/r");
  assert.equal(await prs.baseBranch(), "trunk");
  assert.deepEqual(await prs.find("factory/card-7"), {
    number: 7,
    url: "https://x/pull/7",
    state: "OPEN",
    draft: true,
    conflicting: true,
  });
  const made = await prs.open({
    branch: "factory/card-7",
    base: "trunk",
    title: "T",
    body: "B",
    draft: true,
  });
  assert.equal(made.number, 7);
  assert.ok(asked.some((a) => a[1] === "create" && a.includes("--draft")));
  await prs.update(7, "New text", true);
  assert.ok(asked.some((a) => a[1] === "ready" && a.includes("--undo")));
  await prs.comment(7, "Done");
  assert.deepEqual(
    (await prs.said(7)).map((m) => `${m.author}: ${m.body}`),
    ["owner: (a.ts) Rename", "owner: Looks good", "owner: Later", ": Hm"],
  );

  const empty = githubPullRequests(
    pretendCli({ "repo view": "", "pr list": [] }).cli,
    "o/r",
  );
  assert.equal(await empty.baseBranch(), "main");
  assert.equal(await empty.find("x"), null);
  await assert.rejects(
    empty.open({
      branch: "x",
      base: "main",
      title: "T",
      body: "B",
      draft: false,
    }),
    /did not show/,
  );
});

test("the checks run through the system's shell, with what failed written down", async () => {
  const folder = mkdtempSync(join(tmpdir(), "checks-"));
  assert.deepEqual(await realShell(folder, "echo fine"), {
    ok: true,
    output: "fine\n",
  });
  const outcome = await runChecks(folder, [
    { name: "App", folder, command: "echo one && exit 3" },
    { name: "Site", folder, command: "echo ok" },
  ]);
  assert.equal(outcome.passed, false);
  assert.match(
    outcome.report,
    /### App: `echo one && exit 3` failed\n\n```\none\n```/,
  );
  assert.doesNotMatch(outcome.report, /Site/);
  assert.equal((await realShell(join(folder, "gone"), "echo x")).ok, false);
});

test("the board work is put together from a factory with a connected board, and again when it changes", () => {
  const project = mkdtempSync(join(tmpdir(), "work-"));
  const root = join(project, "factory");
  mkdirSync(root);
  const company = (tracker: string) => {
    writeFileSync(
      join(root, "factory.json"),
      JSON.stringify({
        name: "Co",
        about: "A test.",
        tracker,
        kits: [],
        extensions: [],
      }),
    );
  };
  company("none");
  const claude: Claude = { run: () => Promise.resolve({ ok: true, text: "" }) };
  const { cli } = pretendCli({});
  // Where the code lives: GitHub fills the `code` slot.
  const github = githubAddOn(cli);
  const settings = {
    project,
    cli,
    claude,
    available: { kits: [], extensions: [github.extension] },
    onChange: () => undefined,
  };
  assert.equal(workFor({ ...settings, root, codeHosts: {} }), null);

  const connected = new ConnectedWork({ ...settings, coach: { claude } });
  connected.connect(root);
  assert.equal(connected.view(), null);
  assert.throws(() => connected.orRefuse(), /Connect a board first/);

  company("github");
  writeFileSync(
    join(root, "board.json"),
    JSON.stringify({
      github: { repository: "o/r", board: 1, label: "*", stages: {} },
    }),
  );
  // A code host only some other extension could give: the builder cannot
  // work the board, and says why.
  const elsewhere = new ConnectedWork({
    ...settings,
    coach: { claude },
    codeHosts: {},
  });
  elsewhere.connect(root);
  assert.throws(
    () => elsewhere.orRefuse(),
    /The code lives with github, where the builder cannot push yet/,
  );
  const nowhere = new ConnectedWork({
    ...settings,
    available: { kits: [], extensions: [] },
    coach: { claude },
  });
  nowhere.connect(root);
  assert.throws(() => nowhere.orRefuse(), /Nothing says where the code lives/);

  connected.connect(root);
  const work = connected.orRefuse();
  assert.equal(connected.hostOrRefuse().name, "GitHub");
  // The builder works as soon as the factory starts; the coach waits.
  assert.equal(connected.view()?.builder.on, true);
  assert.equal(connected.view()?.coach.on, false);
  connected.connect(root);
  assert.equal(connected.orRefuse(), work);
  connected.stop();
  assert.equal(connected.view(), null);
});

test("a failed check's report shows the lines that name what failed, then its summary", () => {
  const output = [
    "ok 1 adds",
    "✘ 2 the day view shows Rosi",
    ...Array.from({ length: 40 }, (_, n) => `ok ${String(n + 3)} passes`),
    "84 passed, 1 failed",
  ].join("\n");
  const shown = shownOutput(output).split("\n");
  assert.equal(shown[0], "✘ 2 the day view shows Rosi");
  assert.equal(shown[1], "…");
  assert.equal(shown.at(-1), "84 passed, 1 failed");
  assert.equal(shown.length, 32);
  assert.equal(shownOutput("short\nfailed"), "short\nfailed");
});

test("the board remembers each card's pull request, and whether an open one clashes with main", () => {
  const seen = new SeenPullRequests();
  const card = (number: number, pullRequest: object | null) =>
    ({ number, pullRequest }) as unknown as BoardCard;
  const pr = (state: string, conflicting: boolean) => ({
    number: 1,
    url: "https://x/pull/1",
    state,
    draft: false,
    conflicting,
    thread: [],
  });
  seen.note([card(3, pr("OPEN", true)), card(4, pr("MERGED", true))]);
  assert.deepEqual(seen.of(3), {
    pullRequest: "https://x/pull/1",
    pullRequestState: "open",
    conflict: true,
  });
  assert.equal(seen.of(4).conflict, false);
  assert.equal(seen.of(4).pullRequestState, "merged");
  assert.deepEqual(seen.of(5), {
    pullRequest: null,
    pullRequestState: null,
    conflict: false,
  });
  seen.note([card(3, null)]);
  assert.deepEqual(seen.of(3), {
    pullRequest: "https://x/pull/1",
    pullRequestState: "open",
    conflict: false,
  });
  seen.note([card(6, { ...pr("OPEN", false), draft: true })]);
  seen.note([card(7, pr("CLOSED", false))]);
  assert.equal(seen.of(6).pullRequestState, "draft");
  assert.equal(seen.of(7).pullRequestState, "closed");
});

test("Resolve asks the builder to bring in main and settle the clash", () => {
  assert.match(RESOLVE_ASK, /bring in the latest main/);
  assert.match(RESOLVE_ASK, /merge conflicts/);
});

test("built again with its pull request open, the description stays and what the run did is a comment from the factory", async () => {
  const said: string[] = [];
  const updated: (string | null)[] = [];
  const prs: PullRequests = {
    baseBranch: () => Promise.resolve("main"),
    find: () =>
      Promise.resolve({
        number: 9,
        url: "https://x/pull/9",
        state: "OPEN",
        draft: false,
      }),
    open: () => Promise.reject(new Error("not opened again")),
    update: (_number, body) => {
      updated.push(body);
      return Promise.resolve();
    },
    comment: (_number, text) => {
      said.push(text);
      return Promise.resolve();
    },
    said: () => Promise.resolve([]),
  };
  const url = await openOrUpdate(
    { ...prs, fileLink: (branch, path) => `${branch}/${path}` },
    { number: 4, title: "A card" },
    "Brought in main and resolved the clash in a.ts.",
  );
  assert.equal(url, "https://x/pull/9");
  assert.deepEqual(updated, [null]);
  assert.match(said[0] ?? "", /resolved the clash/);
  assert.equal(readNote(said[0] ?? ""), "fixed");
});

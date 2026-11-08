import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Claude } from "@software-factory/core";

import type { Cli } from "../src/add-ons/github/github.ts";
import { realShell, runChecks, shownOutput } from "../src/builder/checks.ts";
import { ConnectedWork, workFor } from "../src/builder/connect-work.ts";
import { githubPullRequests } from "../src/builder/pull-requests.ts";

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
      { number: 7, url: "https://x/pull/7", state: "OPEN", isDraft: true },
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
  const settings = {
    project,
    cli,
    claude,
    available: { kits: [], extensions: [] },
    onChange: () => undefined,
  };
  assert.equal(workFor({ ...settings, root }), null);

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
  connected.connect(root);
  const work = connected.orRefuse();
  assert.equal(connected.view()?.builder.on, false);
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

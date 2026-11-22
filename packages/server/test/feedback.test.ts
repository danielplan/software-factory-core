import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import type { Cli } from "../src/github-cli.ts";
import { FeedbackArrivals } from "../src/feedback/arrivals.ts";
import { boardOf, FeedbackBoard } from "../src/feedback/board.ts";
import { feedbackRoutes } from "../src/feedback/routes.ts";
import { plugsOf } from "./plugs.ts";
import { pretendClaude } from "./pretend-claude.ts";

// Signals' and Personas' plugs, from the factory's records.
function plugged(store: KobbleStore) {
  const plugs = plugsOf(store);
  return { signals: () => plugs.signals, personas: () => plugs.personas };
}

// The public feedback board as the server reads and writes it: through the
// GitHub CLI with the person's own sign-in (a stand-in here), what this
// person sent kept beside their settings, and the posts of others arriving as
// signals, matched to personas.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");
const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

type Issue = {
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  html_url: string;
  user: { login: string };
  labels: { name: string }[];
  reactions: { "+1": number };
  pull_request?: object;
};

const issue = (number: number, more: Partial<Issue> = {}): Issue => ({
  number,
  title: `Post ${String(number)}`,
  body: "",
  state: "open",
  created_at: `2026-11-2${String(number % 10)}T10:00:00Z`,
  html_url: `https://github.com/acme/software-factory-feedback/issues/${String(number)}`,
  user: { login: "harbor-team" },
  labels: [{ name: "wish" }],
  reactions: { "+1": 2 },
  ...more,
});

// A GitHub with these issues, signed in as `login` (or not), remembering
// what it was asked.
function github(issues: Issue[], login: string | null = "me") {
  const asked: string[][] = [];
  const cli: Cli = {
    run: (args) => {
      asked.push(args);
      const said = (out: unknown, code = 0, err = "") =>
        Promise.resolve({ code, out: JSON.stringify(out), err });
      if (args[1] === "user")
        return login
          ? Promise.resolve({ code: 0, out: `${login}\n`, err: "" })
          : said("", 1, "gh: not logged in (401)");
      if (args.includes("--method")) {
        if (args.some((one) => one.startsWith("title=Refused")))
          return said("", 1, "HTTP 404 Not Found");
        if (args[3]?.endsWith("/reactions")) return said({});
        const title = args.find((one) => one.startsWith("title="));
        return said(
          issue(90, {
            title: title?.slice(6) ?? "",
            labels: [{ name: args.at(-1)?.slice(9) ?? "" }],
          }),
        );
      }
      return said(issues);
    },
    start: () => ({ answer: () => undefined, done: Promise.resolve(0) }),
  };
  return { cli, asked };
}

function factory() {
  const project = mkdtempSync(join(tmpdir(), "feedback-"));
  made.push(project);
  const root = join(project, "factory");
  mkdirSync(root);
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  return { project, root, store: new KobbleStore(root) };
}

const url = new URL("http://localhost/");

test("the board is the feedback repository beside the core's releases", () => {
  assert.equal(
    boardOf("github:acme/software-factory-core"),
    "acme/software-factory-feedback",
  );
});

test("a post's state comes from the issue: sent, seen, planned, done", async () => {
  const { cli } = github([
    issue(1),
    issue(2, { labels: [{ name: "bug" }, { name: "seen" }] }),
    issue(3, { labels: [{ name: "planned" }] }),
    issue(4, { state: "closed" }),
    issue(5, { pull_request: {} }),
  ]);
  const board = new FeedbackBoard(
    cli,
    "acme/fb",
    join(factory().root, "x.json"),
  );
  const posts = await board.posts();
  assert.deepEqual(
    posts.map((one) => [one.number, one.kind, one.state, one.thumbs]),
    [
      [1, "wish", "sent", 2],
      [2, "bug", "seen", 2],
      [3, "wish", "planned", 2],
      [4, "wish", "done", 2],
    ],
  );
  assert.equal(await board.login(), "me");
});

test("with nobody signed in or no board there, the board is empty", async () => {
  const none: Cli = {
    run: () => Promise.reject(new Error("no gh")),
    start: () => ({ answer: () => undefined, done: Promise.resolve(0) }),
  };
  const board = new FeedbackBoard(
    none,
    "acme/fb",
    join(factory().root, "x.json"),
  );
  assert.deepEqual(await board.posts(), []);
  assert.equal(await board.login(), null);
  const out = github([], null);
  assert.equal(
    await new FeedbackBoard(out.cli, "acme/fb", "x.json").login(),
    null,
  );
});

test("sending puts a post on the board and remembers it, then follows it", async () => {
  const { project, root } = factory();
  const { cli, asked } = github([issue(90, { title: "Dark look" })]);
  const routes = feedbackRoutes({
    project,
    cli,
    claude: pretendClaude([]).claude,
    ...plugged(new KobbleStore(root)),
    changed: () => undefined,
    onSignals: () => undefined,
    repository: "acme/software-factory-feedback",
  });
  const route = (name: string) => {
    const found = routes.routes[name];
    assert.ok(found, name);
    return found;
  };
  const sent = (await route("POST /api/feedback/send")(
    {
      kind: "wish",
      title: " A dark look ",
      body: "Please.\n\n---\n\n- **page:** Home",
    },
    url,
  )) as { number: number; title: string };
  assert.equal(sent.number, 90);
  assert.equal(sent.title, "A dark look");
  assert.ok(
    asked.some(
      (args) =>
        args.includes("repos/acme/software-factory-feedback/issues") &&
        args.includes("labels[]=wish"),
    ),
  );
  await route("POST /api/feedback/thumb")({ number: 7 }, url);
  const view = (await route("GET /api/feedback")({}, url)) as {
    login: string;
    mine: { number: number; own: boolean }[];
  };
  assert.equal(view.login, "me");
  // What it sent shows, with a 👍 on a post the board does not list left out.
  assert.deepEqual(
    view.mine.map((one) => [one.number, one.own]),
    [[90, true]],
  );
});

test("sending is refused plainly: no kind, no title, a missing board, a bad number", async () => {
  const { project, root } = factory();
  const { cli } = github([]);
  const { routes } = feedbackRoutes({
    project,
    cli,
    claude: pretendClaude([]).claude,
    ...plugged(new KobbleStore(root)),
    changed: () => undefined,
    onSignals: () => undefined,
  });
  const send = routes["POST /api/feedback/send"];
  assert.ok(send);
  await assert.rejects(async () => send({ kind: "praise", title: "x" }, url), {
    message: /bug or a wish/,
  });
  await assert.rejects(async () => send({ kind: "bug" }, url), {
    message: /title/,
  });
  await assert.rejects(
    async () => send({ kind: "bug", title: "Refused" }, url),
    { message: /not there yet/ },
  );
  await assert.rejects(
    async () => routes["POST /api/feedback/thumb"]?.({ number: 0 }, url),
    { message: /which post/ },
  );
});

test("a post from others arrives once as a signal and is matched to a persona", async () => {
  const { project, root, store } = factory();
  writeFileSync(join(root, "team.env"), "FACTORY_FEEDBACK_READS=yes\n");
  const { cli } = github([
    issue(41, {
      title: "The builder stops when git push is refused",
      labels: [{ name: "bug" }],
      body: "It stops.\n\n---\n\n- **page:** Factory",
    }),
    issue(38, { title: "Two cards at once" }),
    issue(22, { title: "Dark look", state: "closed" }),
  ]);
  const claude = pretendClaude([
    {
      calls: [],
      reply: `Here: ${JSON.stringify({
        matches: [
          { post: 41, persona: "bruno", why: "they lose a morning" },
          { post: 38, persona: null },
          { post: 99, persona: "mia" },
        ],
      })}`,
    },
  ]);
  let changed = 0;
  const arrivals = new FeedbackArrivals({
    board: new FeedbackBoard(
      cli,
      "acme/fb",
      join(root, "settings", "sent.json"),
    ),
    ...plugged(store),
    claude: claude.claude,
    factory: root,
    cwd: project,
    onChange: () => {
      changed++;
    },
  });
  assert.ok(arrivals.reads());
  assert.equal(await arrivals.read(), 2);
  assert.equal(await arrivals.read(), 0);
  const added = store
    .all("signals")
    .filter((one) => one.source === "feedback")
    .sort((a, b) => a.sourceId?.localeCompare(b.sourceId ?? "") ?? 0);
  assert.deepEqual(
    added.map((one) => [one.sourceId, one.type, one.customer, one.persona]),
    [
      ["feedback-38", "request", "harbor-team", null],
      ["feedback-41", "bug", "harbor-team", "bruno"],
    ],
  );
  const bug = added[1];
  assert.ok(bug);
  assert.equal(bug.why, "they lose a morning");
  assert.equal(
    bug.text,
    "The builder stops when git push is refused\n\nIt stops.",
  );
  assert.ok(changed >= 2);
});

test("a factory that does not read the board takes in nothing; a failed matching leaves posts unmatched", async () => {
  const { project, root, store } = factory();
  const { cli } = github([issue(41)]);
  const make = (claude: ReturnType<typeof pretendClaude>["claude"]) =>
    new FeedbackArrivals({
      board: new FeedbackBoard(
        cli,
        "acme/fb",
        join(root, "settings", "s.json"),
      ),
      ...plugged(store),
      claude,
      factory: root,
      cwd: project,
      onChange: () => undefined,
    });
  const off = make(pretendClaude([]).claude);
  assert.ok(!off.reads());
  assert.equal(await off.read(), 0);
  off.start();
  off.close();
  writeFileSync(join(root, "team.env"), "FACTORY_FEEDBACK_READS=yes\n");
  const lost = make(pretendClaude([{ calls: [], reply: "not json" }]).claude);
  assert.equal(await lost.read(), 1);
  assert.equal(
    store.all("signals").find((one) => one.sourceId === "feedback-41")?.persona,
    null,
  );
});

test("a person changes or removes the persona a post was matched to", async () => {
  const { project, root, store } = factory();
  writeFileSync(join(root, "team.env"), "FACTORY_FEEDBACK_READS=yes\n");
  const { cli } = github([issue(41)]);
  const { routes, arrivals } = feedbackRoutes({
    project,
    cli,
    claude: pretendClaude([
      {
        calls: [],
        reply:
          '{"matches":[{"post":41,"persona":"bruno","why":"they lose a morning"}]}',
      },
    ]).claude,
    ...plugged(store),
    changed: () => undefined,
    onSignals: () => undefined,
  });
  await arrivals.read();
  const signal = () =>
    store.all("signals").find((one) => one.source === "feedback");
  const id = signal()?.id ?? "";
  const set = routes["POST /api/feedback/persona"];
  assert.ok(set);
  await set({ id, persona: "mia" }, url);
  assert.equal(signal()?.persona, "mia");
  assert.equal(signal()?.why, undefined);
  await set({ id, persona: null }, url);
  assert.equal(signal()?.persona, null);
  await assert.rejects(async () => set({ id, persona: "nobody" }, url), {
    message: /no such persona/,
  });
  await assert.rejects(async () => set({ id, persona: 4 }, url), {
    message: /which persona/,
  });
  await assert.rejects(async () => set({ id: "S-0003", persona: null }, url), {
    message: /not a post/,
  });
});

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type Claude,
  defineKit,
  type RunOptions,
  run,
  Workspace,
} from "@software-factory/core";

import type { Stage } from "../src/api.ts";
import { BoardWork } from "../src/builder/board-work.ts";
import { copyName, Jobs, type JobsOptions } from "../src/builder/jobs.ts";
import type { Message } from "../src/builder/decide.ts";
import type {
  PullRequest,
  PullRequests,
} from "../src/builder/pull-requests.ts";
import {
  type Card,
  type Cards,
  planOf,
  STUCK_LABEL,
  withPlan,
} from "../src/cards/cards.ts";

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
export const available = { kits: [kit], extensions: [] };

export async function project() {
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
      // The product is described next to its code (0.6.0): the builder's own
      // checks find it there.
      products: ["app"],
    }),
  );
  write(
    "app/product.json",
    JSON.stringify({
      id: "app",
      name: "App",
      kind: "web-app",
      about: "The app.",
    }),
  );
  write("app/README.md", "The app\n");
  writeFileSync(join(source, ".gitignore"), "node_modules\n");
  writeFileSync(join(source, "app", "package-lock.json"), "{}");
  const git = (...args: string[]) => run("git", ["-C", source, ...args]);
  await git("add", ".");
  await git("commit", "--quiet", "-m", "start");
  // Origin is the board's repository on GitHub, as the builder checks; git
  // takes that name to the bare repository here.
  await git("remote", "add", "origin", "https://github.com/o/r.git");
  await git(
    "config",
    `url.${join(folder, "origin.git")}.insteadOf`,
    "https://github.com/o/r.git",
  );
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
export const now = () =>
  `2026-01-01T00:${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock++ % 60).padStart(2, "0")}Z`;

export type Kept = {
  title: string;
  stage: Stage;
  body: string;
  comments: Message[];
  closed?: boolean;
  labels?: string[];
};

export function pretendBoard(kept: Map<number, Kept>) {
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
          labels: c.labels ?? [],
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
    markStuck: (number, stuck) => {
      const c = kept.get(number);
      if (c)
        c.labels = stuck
          ? [...new Set([...(c.labels ?? []), STUCK_LABEL])]
          : (c.labels ?? []).filter((label) => label !== STUCK_LABEL);
      said.push(`#${String(number)} ${stuck ? "stuck" : "not stuck"}`);
      return Promise.resolve();
    },
    writePlan: (number, plan) => {
      const c = kept.get(number);
      if (c) c.body = withPlan(c.body, plan);
      return Promise.resolve();
    },
  };
  return { cards, said };
}

export function pretendPullRequests() {
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
      if (pr) Object.assign(pr, { draft, ...(body === null ? {} : { body }) });
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
export function pretendClaude(turn: (options: RunOptions) => string | null) {
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

export async function settled(work: BoardWork) {
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

export function setUp(
  kept: Map<number, Kept>,
  claude: Claude,
  copy: (n: string) => Promise<Workspace>,
  shellOk: boolean[],
  places = 1,
  more: Partial<JobsOptions> = {},
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
    copies: {
      chat: (place) => copy(copyName("chat", place)),
      build: (place) => copy(copyName("build", place)),
    },
    shell: (cwd, command) => {
      checks.push(command);
      if (command === "npm ci")
        return Promise.resolve({ ok: true, output: "" });
      return Promise.resolve({
        ok: shellOk.shift() ?? true,
        output: "1 test failed\nexpected 2",
      });
    },
    ...more,
  });
  const work = new BoardWork({
    cards: board.cards,
    pullRequests: prs.pullRequests,
    jobs,
    onChange: () => undefined,
    now: () => new Date(0),
    places: () => places,
  });
  return { work, board, prs, checks };
}

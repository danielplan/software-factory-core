import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { saveCompany } from "@software-factory/core";

import type { Cli } from "../src/add-ons/github/github.ts";
import type { Fetcher } from "../src/add-ons/jira/jira.ts";
import { readBoard } from "../src/connect/board-file.ts";
import { suggestStages } from "../src/connect/stages.ts";
import type { Session } from "../src/session.ts";
import { stage } from "./stage.ts";

// Connecting the factory to where work is tracked: a GitHub board through
// the GitHub CLI (here a stand-in), Jira Cloud with an API token (a
// stand-in for Jira's answers); each checked before it is saved.

// A GitHub CLI that is installed, signs in when asked, and knows one
// owner's repositories and board.
function pretendGitHub(): Cli & { answered: string[] } {
  let signedIn = false;
  const answered: string[] = [];
  const says = (out: string) => Promise.resolve({ code: 0, out, err: "" });
  const fails = (err: string) => Promise.resolve({ code: 1, out: "", err });
  return {
    answered,
    run: (args) => {
      const asked = args.join(" ");
      if (asked === "--version") return says("gh version 2");
      if (asked === "api user --jq .login")
        return signedIn ? says("octo\n") : fails("not signed in");
      if (asked.startsWith("api user/repos"))
        return says("acme/shop\nacme/blog\n");
      if (asked === "project list --owner acme --format json")
        return says('{"projects":[{"number":1,"title":"Roadmap","id":"x"}]}');
      if (asked.startsWith("project list --owner nope"))
        return fails("your token is missing required scopes [read:project]");
      if (asked.startsWith("project view 1 --owner acme"))
        return says('{"title":"Roadmap"}');
      if (asked.startsWith("project field-list 1"))
        return says(
          '{"fields":[{"name":"Status","options":[{"name":"Todo"},{"name":"In Progress"},{"name":"Done"}]}]}',
        );
      return fails("unknown");
    },
    start: (args, onLine) => {
      let finish = (_code: number) => {};
      const done = new Promise<number>((resolve) => {
        finish = resolve;
      });
      setImmediate(() => {
        onLine("! First copy your one-time code: ABCD-1234");
      });
      return {
        answer: (text) => {
          answered.push(`${args[1] ?? ""}:${JSON.stringify(text)}`);
          signedIn = true;
          setImmediate(() => {
            finish(args[1] === "refresh" ? 1 : 0);
          });
        },
        done,
      };
    },
  };
}

// Jira's answers: a site that is there, a token it takes, one project.
const pretendJira: Fetcher = (url, { headers }) => {
  if (url.startsWith("https://down.example"))
    return Promise.reject(new Error("no"));
  const good =
    headers.Authorization ===
    `Basic ${Buffer.from("ann@acme.com:t0ken").toString("base64")}`;
  const answer = (status: number, body: unknown) =>
    Promise.resolve({
      ok: status === 200,
      status,
      json: () => Promise.resolve(body),
    });
  if (url.includes("broken")) return answer(500, {});
  if (!good) return answer(401, {});
  if (url.endsWith("/project/ACME/statuses"))
    return answer(200, [
      { statuses: [{ name: "Backlog" }, { name: "Selected for Development" }] },
      {
        statuses: [
          { name: "In Review" },
          { name: "Done" },
          { name: "Backlog" },
        ],
      },
    ]);
  if (url.endsWith("/rest/api/3/myself"))
    return answer(200, { displayName: "Ann" });
  return answer(200, { values: [{ key: "ACME", name: "Acme web", id: "1" }] });
};

test("connecting a GitHub board: the CLI is here, signing in shows a code, the board is picked and checked, then saved", async () => {
  const cli = pretendGitHub();
  const { session, server, post, base } = await stage(
    undefined,
    {},
    {
      cli,
      fetcher: pretendJira,
    },
  );
  const get = async (path: string) =>
    (await fetch(`${base}${path}`)).json() as Promise<unknown>;
  try {
    session.createCompany({ name: "Acme", about: "" });
    assert.deepEqual(await get("/api/add-ons/github/status"), {
      cli: true,
      login: null,
      signingIn: null,
    });
    await post("/api/add-ons/github/sign-in", {});
    await until(async () => {
      const status = (await get("/api/add-ons/github/status")) as {
        login: string | null;
      };
      return status.login === "octo";
    });
    assert.deepEqual(cli.answered, ['login:"\\n"']);
    assert.deepEqual(await get("/api/add-ons/github/repositories"), [
      "acme/shop",
      "acme/blog",
    ]);
    assert.deepEqual(await get("/api/add-ons/github/boards?owner=acme"), [
      { number: 1, title: "Roadmap" },
    ]);
    const scopes = await fetch(`${base}/api/add-ons/github/boards?owner=nope`);
    assert.equal(scopes.status, 409);
    assert.match(
      ((await scopes.json()) as { error: string }).error,
      /allow it/,
    );

    // Asked to allow boards, the refresh that does not finish says so.
    await post("/api/add-ons/github/sign-in", { more: "yes" });
    await until(async () => {
      const status = (await get("/api/add-ons/github/status")) as {
        signingIn: { problem: string | null } | null;
      };
      return status.signingIn?.problem !== null && status.signingIn !== null;
    });

    assert.equal(
      (await post("/api/add-ons/github/connect", { repository: "x", board: 1 }))
        .status,
      409,
    );
    assert.deepEqual(
      await get("/api/add-ons/github/columns?repository=acme/shop&board=1"),
      {
        columns: ["Todo", "In Progress", "Done"],
        suggested: {
          backlog: "",
          planning: "",
          todo: "Todo",
          doing: "In Progress",
          review: "",
          done: "Done",
        },
      },
    );
    const wrong = await post("/api/add-ons/github/connect", {
      repository: "acme/shop",
      board: 1,
      stages: { review: "QA" },
    });
    assert.match(
      ((await wrong.json()) as { error: string }).error,
      /no column “QA”/,
    );
    const connected = await post("/api/add-ons/github/connect", {
      repository: "acme/shop",
      board: 1,
      label: "*",
      stages: { backlog: "Todo", todo: "" },
    });
    assert.deepEqual(await connected.json(), {
      message: "Connected to “Roadmap”, 3 columns.",
    });
    const state = factory(session);
    assert.equal(state.company.tracker, "github");
    // In the factory's board.json, which lives with the project.
    assert.deepEqual(state.board.github, {
      repository: "acme/shop",
      board: 1,
      label: "*",
      stages: {
        backlog: "Todo",
        planning: "",
        todo: "",
        doing: "In Progress",
        review: "",
        done: "Done",
      },
    });
    assert.equal(state.onboarding, false);
    // The stand-in computer has no GitHub CLI to install.
    assert.equal((await post("/api/add-ons/github/install", {})).status, 409);
  } finally {
    session.close();
    server.close();
  }
});

test("connecting Jira: the token is checked against Jira, which lists the projects to pick from", async () => {
  const { project, session, server, post } = await stage(
    undefined,
    {},
    {
      cli: pretendGitHub(),
      fetcher: pretendJira,
    },
  );
  const login = {
    site: "https://acme.atlassian.net/",
    email: "ann@acme.com",
    token: "t0ken",
  };
  const error = async (answer: Response) =>
    ((await answer.json()) as { error: string }).error;
  try {
    session.createCompany({ name: "Acme", about: "" });
    const listed = await post("/api/add-ons/jira/projects", login);
    assert.deepEqual(await listed.json(), {
      name: "Ann",
      projects: [{ key: "ACME", name: "Acme web" }],
    });
    assert.match(
      await error(
        await post("/api/add-ons/jira/projects", { ...login, token: "no" }),
      ),
      /did not accept/,
    );
    assert.match(
      await error(
        await post("/api/add-ons/jira/projects", {
          ...login,
          site: "down.example",
        }),
      ),
      /no Jira at down\.example/,
    );
    assert.match(
      await error(
        await post("/api/add-ons/jira/projects", {
          ...login,
          site: "broken.example",
        }),
      ),
      /error \(500\)/,
    );
    assert.match(
      await error(
        await post("/api/add-ons/jira/projects", { ...login, email: " " }),
      ),
      /Give the site/,
    );
    assert.match(
      await error(
        await post("/api/add-ons/jira/connect", { ...login, project: "NOPE" }),
      ),
      /Choose one/,
    );
    assert.match(
      await error(
        await post("/api/add-ons/jira/connect", {
          ...login,
          project: "ACME",
          label: "no way!",
        }),
      ),
      /cannot be a label/,
    );
    const columns = await post("/api/add-ons/jira/columns", {
      ...login,
      project: "ACME",
    });
    assert.deepEqual(await columns.json(), {
      columns: ["Backlog", "Selected for Development", "In Review", "Done"],
      suggested: {
        backlog: "Backlog",
        planning: "",
        todo: "Selected for Development",
        doing: "",
        review: "In Review",
        done: "Done",
      },
    });
    const connected = await post("/api/add-ons/jira/connect", {
      ...login,
      project: "ACME",
    });
    assert.deepEqual(await connected.json(), {
      message: "Connected to “Acme web” (ACME).",
    });
    const state = factory(session);
    assert.equal(state.company.tracker, "jira");
    const jira = state.board.jira;
    assert.ok(jira);
    assert.equal(jira.site, "acme.atlassian.net");
    assert.equal(jira.label, "factory");
    assert.equal(jira.stages.review, "In Review");
    // The token is a secret, kept in the settings, never in board.json.
    const token = state.settings
      .find((g) => g.id === "jira")
      ?.fields.find((f) => f.key === "JIRA_TOKEN");
    assert.equal(token?.value, "(set)");
    assert.equal((await post("/api/connect/own-board", {})).status, 200);
    assert.equal(factory(session).company.tracker, "none");

    // On the factory's own board no tracker is on; one that is off
    // answers nothing.
    saveCompany(join(project, "factory"), {
      ...factory(session).company,
      without: ["github"],
    });
    session.chooseBoard("none");
    assert.deepEqual(
      factory(session)
        .addOns.filter((a) => a.on && a.tracker)
        .map((a) => a.id),
      [],
    );
    assert.match(
      await error(await post("/api/add-ons/github/sign-in", {})),
      /GitHub board is off/,
    );

    // The page switches add-ons on and off: a built-in one is listed in
    // without while off, another in extensions while on; never off the one
    // work is tracked with.
    const turn = (id: string, on: boolean) => post("/api/add-ons", { id, on });
    assert.equal((await turn("github", true)).status, 200);
    assert.equal((await turn("voice", true)).status, 200);
    // Jira stays off: on the factory's own board no tracker was on.
    assert.deepEqual(factory(session).company.without, ["jira"]);
    assert.deepEqual(factory(session).company.extensions, ["voice"]);
    await turn("voice", false);
    assert.deepEqual(factory(session).company.extensions, []);
    session.chooseBoard("jira");
    assert.match(
      await error(await turn("jira", false)),
      /Work is tracked with Jira Cloud/,
    );
    assert.match(await error(await turn("telepathy", true)), /no add-on/);
  } finally {
    session.close();
    server.close();
  }
});

function factory(session: Session) {
  const state = session.state();
  assert.ok(state.mode === "factory");
  return state;
}

async function until(done: () => Promise<boolean>): Promise<void> {
  for (let tries = 0; tries < 200; tries += 1) {
    if (await done()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("It never happened.");
}

test("the board's columns are matched to the factory's stages by their names", () => {
  assert.deepEqual(
    suggestStages(["Icebox", "Up next", "Doing", "QA", "Shipped"]),
    {
      backlog: "Icebox",
      planning: "",
      todo: "Up next",
      doing: "Doing",
      review: "QA",
      done: "Shipped",
    },
  );
  assert.deepEqual(suggestStages(["Whatever"]), {
    backlog: "",
    planning: "",
    todo: "",
    doing: "",
    review: "",
    done: "",
  });
});

test("a board's Planning column is matched to the Planning stage", () => {
  assert.deepEqual(
    suggestStages([
      "Backlog",
      "Planning",
      "Todo",
      "In Progress",
      "In Review",
      "Done",
    ]),
    {
      backlog: "Backlog",
      planning: "Planning",
      todo: "Todo",
      doing: "In Progress",
      review: "In Review",
      done: "Done",
    },
  );
  assert.equal(suggestStages(["Refinement", "Ready"]).planning, "Refinement");
});

test("a board file written before Planning existed still loads", () => {
  const root = mkdtempSync(join(tmpdir(), "board-"));
  writeFileSync(
    join(root, "board.json"),
    JSON.stringify({
      github: {
        label: "factory",
        stages: { backlog: "", todo: "Todo", doing: "", review: "", done: "" },
      },
    }),
  );
  assert.equal(readBoard(root).github?.stages.planning, "");
  assert.equal(readBoard(root).github?.stages.todo, "Todo");
});

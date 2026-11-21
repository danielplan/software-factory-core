import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { Claude } from "@software-factory/core";

import type { Cli } from "../src/add-ons/github/github.ts";
import { Refused } from "../src/refused.ts";
import { releasesRoutes, type ReleasesView } from "../src/releases/routes.ts";

// The Releases page's routes with a stand-in GitHub CLI and a stand-in
// kobold: the coming release, the past ones, and making a release.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");
const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

type Request = {
  number: number;
  title: string;
  headRefName: string;
  mergeCommit: { oid: string } | null;
  labels: { name: string }[];
};

const request = (
  number: number,
  more: Partial<Request> = {},
): Request & { body: string; url: string } => ({
  number,
  title: `Change ${String(number)}`,
  body: "",
  url: `https://github.com/acme/shop/pull/${String(number)}`,
  headRefName: `factory/issue-${String(number + 100)}`,
  mergeCommit: { oid: `sha${String(number)}` },
  labels: [],
  ...more,
});

type World = {
  tags: string[];
  releases: object[];
  requests: ReturnType<typeof request>[];
  // The commits after the last tag.
  after: string[];
  issues: { number: number; labels: { name: string }[] }[];
  refuse?: string;
};

function github(world: World) {
  const asked: string[][] = [];
  const cli: Cli = {
    run: (args) => {
      asked.push(args);
      const said = (out: unknown, code = 0, err = "") =>
        Promise.resolve({
          code,
          out: typeof out === "string" ? out : JSON.stringify(out),
          err,
        });
      const [first, second] = args;
      if (first === "repo") return said("main\n");
      if (first === "release") {
        return world.refuse ? said("", 1, world.refuse) : said("");
      }
      if (first === "pr") return said(world.requests);
      if (first === "issue") return said(world.issues);
      const path = args[1] ?? "";
      if (second === "api" || first === "api") {
        if (path.includes("matching-refs"))
          return said(world.tags.map((tag) => `refs/tags/${tag}`).join("\n"));
        if (path.includes("/compare/")) return said(world.after.join("\n"));
        if (path.includes("/releases")) return said(world.releases);
      }
      return said("", 1, `unexpected ${args.join(" ")}`);
    },
    start: () => ({ answer: () => undefined, done: Promise.resolve(0) }),
  };
  return { cli, asked };
}

function kobold(reply: { act: boolean; why: string } | "fails") {
  const seen: string[] = [];
  const claude: Claude = {
    run: (options) => {
      seen.push(options.prompt);
      return Promise.resolve(
        reply === "fails"
          ? { ok: false, text: "", error: "no" }
          : { ok: true, text: `Here: ${JSON.stringify(reply)}` },
      );
    },
  };
  return { claude, seen };
}

function project(connected = true) {
  const folder = mkdtempSync(join(tmpdir(), "releases-"));
  made.push(folder);
  const root = join(folder, "factory");
  mkdirSync(root);
  cpSync(join(ACME, "factory", "factory.json"), join(root, "factory.json"));
  writeFileSync(
    join(root, "factory.json"),
    JSON.stringify({
      name: "Acme",
      about: "Sells tools.",
      tracker: connected ? "github" : "none",
      extensions: [],
      without: [],
      kits: [],
      products: ["shop"],
    }),
  );
  if (connected)
    writeFileSync(
      join(root, "board.json"),
      JSON.stringify({
        github: { repository: "acme/shop", board: 1, label: "*", stages: {} },
      }),
    );
  return folder;
}

const url = new URL("http://localhost/");
const empty = (): World => ({
  tags: [],
  releases: [],
  requests: [],
  after: [],
  issues: [],
});

function routesOf(
  world: World,
  reply: Parameters<typeof kobold>[0],
  connected = true,
) {
  const { cli, asked } = github(world);
  const { claude, seen } = kobold(reply);
  const told: string[] = [];
  const routes = releasesRoutes({
    project: project(connected),
    cli,
    claude,
    changed: (what) => told.push(what),
  });
  const get = () =>
    (
      routes["GET /api/releases"] as (
        b: unknown,
        u: URL,
      ) => Promise<ReleasesView>
    )(null, url);
  const post = (number: unknown) =>
    (routes["POST /api/releases"] as (b: unknown, u: URL) => Promise<unknown>)(
      { number },
      url,
    );
  return { get, post, asked, told, seen };
}

test("the first time everything merged so far is listed, with the starting number", async () => {
  const world = { ...empty(), requests: [request(2), request(1)] };
  const { get, seen } = routesOf(world, { act: true, why: "Because." });
  const view = await get();
  assert.ok(view.connected);
  assert.equal(view.last, null);
  assert.deepEqual(
    view.coming.merged.map((one) => one.number),
    [1, 2],
  );
  assert.equal(view.coming.next, "0.1.0");
  assert.equal(view.coming.why, "Because.");
  assert.deepEqual(view.past, []);
  assert.equal(seen.length, 1);
});

test("only pull requests merged after the last tag are listed, typed by their card's label", async () => {
  const world: World = {
    ...empty(),
    tags: ["v1.4.2", "v1.4.1", "release-9.0.0"],
    releases: [
      {
        tag_name: "v1.4.2",
        body: '<!-- software-factory:why "Only fixes" -->\n## Fixes\n',
        published_at: "2026-11-01T10:00:00Z",
        html_url: "https://github.com/acme/shop/releases/tag/v1.4.2",
        draft: false,
      },
      {
        tag_name: "release-9.0.0",
        body: "x",
        published_at: "2026-10-01T10:00:00Z",
        html_url: "u",
        draft: false,
      },
    ],
    // 1 was released before; 2 and 3 came after; 4 has no merge commit.
    requests: [
      request(1),
      request(2, { title: "Fix the header" }),
      request(3, { labels: [{ name: "type: bug" }] }),
      request(4, { mergeCommit: null }),
    ],
    after: ["sha2", "sha3"],
    issues: [{ number: 102, labels: [{ name: "type: feature" }] }],
  };
  const { get, seen, asked } = routesOf(world, {
    act: false,
    why: "Only fixes and improvements since 1.4.2",
  });
  const view = await get();
  assert.ok(view.connected);
  assert.equal(view.last, "1.4.2");
  assert.deepEqual(
    view.coming.merged.map((one) => [one.number, one.type]),
    [
      [2, "feature"],
      [3, "bug"],
    ],
  );
  assert.equal(view.coming.next, "1.4.3");
  assert.deepEqual(view.past, [
    {
      number: "1.4.2",
      date: "2026-11-01T10:00:00Z",
      url: "https://github.com/acme/shop/releases/tag/v1.4.2",
      why: "Only fixes",
      notes: "## Fixes\n",
    },
  ]);
  assert.ok(
    asked.some((args) =>
      args.some((one) => one.endsWith("compare/v1.4.2...main")),
    ),
  );
  assert.equal(seen.length, 1);
  await get();
  assert.equal(seen.length, 1, "the same work is judged once");
});

test("something to act on raises the middle number", async () => {
  const world = {
    ...empty(),
    tags: ["v1.4.3"],
    requests: [request(5)],
    after: ["sha5"],
  };
  const { get } = routesOf(world, {
    act: true,
    why: "Something changes for people: x",
  });
  const view = await get();
  assert.ok(view.connected);
  assert.equal(view.coming.next, "1.5.0");
});

test("nothing new since the last release: an empty list, no kobold asked, nothing to release", async () => {
  const world = {
    ...empty(),
    tags: ["v1.4.3"],
    requests: [request(1)],
    after: [],
  };
  const { get, post, seen } = routesOf(world, "fails");
  const view = await get();
  assert.ok(view.connected);
  assert.deepEqual(view.coming.merged, []);
  assert.equal(view.coming.why, null);
  assert.equal(seen.length, 0);
  await assert.rejects(post("1.4.4"), /Nothing was merged since 1.4.3/);
});

test("when the kobold cannot judge, the last number is suggested without a reason", async () => {
  const world = {
    ...empty(),
    tags: ["v1.4.3"],
    requests: [request(5)],
    after: ["sha5"],
  };
  const { get } = routesOf(world, "fails");
  const view = await get();
  assert.ok(view.connected);
  assert.equal(view.coming.next, "1.4.4");
  assert.equal(view.coming.why, null);
});

test("Release now makes the tag on the main branch and the release with its notes, and tells the page", async () => {
  const world = {
    ...empty(),
    tags: ["v1.4.3"],
    requests: [
      request(5, {
        title: "Crash on empty cart",
        labels: [{ name: "type: bug" }],
      }),
    ],
    after: ["sha5"],
  };
  const { post, asked, told } = routesOf(world, {
    act: false,
    why: "Only fixes",
  });
  assert.deepEqual(await post(" 1.4.4 "), { number: "1.4.4" });
  const create = asked.find((args) => args[0] === "release");
  assert.ok(create);
  assert.deepEqual(create.slice(0, 8), [
    "release",
    "create",
    "v1.4.4",
    "--repo",
    "acme/shop",
    "--target",
    "main",
    "--title",
  ]);
  assert.equal(create[8], "1.4.4");
  assert.equal(create[9], "--notes");
  assert.match(
    create[10],
    /^<!-- software-factory:why "Only fixes" -->\nOnly fixes\n\n## Fixes\n\n- Crash on empty cart \(\[#5\]\(https:\/\/github.com\/acme\/shop\/pull\/5\)\)\n$/,
  );
  assert.deepEqual(told, ["releases"]);
});

test("a number that is wrong, not higher or already a tag is refused before anything is made", async () => {
  const world = {
    ...empty(),
    tags: ["v1.4.3"],
    requests: [request(5)],
    after: ["sha5"],
  };
  const { post, asked } = routesOf(world, { act: false, why: "Only fixes" });
  await assert.rejects(post("one"), /not a release number/);
  await assert.rejects(post("1.4.3"), /already/);
  await assert.rejects(post("1.2.0"), /not higher/);
  await assert.rejects(post(undefined), /Say which number/);
  assert.ok(!asked.some((args) => args[0] === "release"));
});

test("a refusal from GitHub comes back as a plain refusal", async () => {
  const world = {
    ...empty(),
    requests: [request(5)],
    refuse: "HTTP 403: Resource not accessible",
  };
  const { post, told } = routesOf(world, { act: false, why: "x" });
  await assert.rejects(post("0.1.0"), (error) => {
    assert.ok(error instanceof Refused);
    assert.match(error.message, /Resource not accessible/);
    return true;
  });
  assert.deepEqual(told, []);
});

test("without a connected repository the Settings message comes back", async () => {
  const { get, post } = routesOf(empty(), "fails", false);
  const view = await get();
  assert.ok(!view.connected);
  assert.match(
    view.problem,
    /Connect one in \[Settings\]\(#settings\), under Where work is tracked\./,
  );
  await assert.rejects(post("1.0.0"), /Connect one in \[Settings\]/);
});

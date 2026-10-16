import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Draft } from "../src/api.ts";
import { computerTools } from "../src/installables.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";
import { GIT } from "../src/git.ts";

// The setup canvas: the small cards the coach writes the context on and
// the arrows between them, guessed from the code and its history, then
// confirmed or rewritten with what the owner says; what it proposes to
// install; and the owner's own changes.
// Making the factory writes the cards into the knowledge base and installs
// only what the owner approved.

test("the coach writes small cards in areas and joins them with arrows, and making the factory writes them down", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["set_company", { name: "Acme", about: "Garden tools, sold online." }],
        ["look_at_history", { folder: "<project>" }],
        ["look_at_history", { folder: "<repo>" }],
        [
          "draw",
          {
            cards: [
              {
                area: "How it goes",
                title: "A customer orders",
                icon: "cart",
                from: "code",
              },
            ],
          },
        ],
        [
          "draw",
          {
            cards: [
              {
                area: "How it goes",
                title: "We send it",
                text: "Same day.",
                from: "code",
              },
            ],
          },
        ],
        [
          "draw",
          {
            cards: [
              { area: "Words", title: "Rake", text: "A tool.", from: "code" },
            ],
          },
        ],
        ["draw", { cards: [{ area: " ", title: "x", from: "code" }] }],
        [
          "draw",
          {
            cards: [
              { area: "A", title: "x", text: "y".repeat(121), from: "code" },
            ],
          },
        ],
        [
          "draw",
          { cards: [{ id: "company", area: "A", title: "x", from: "code" }] },
        ],
        ["draw", { arrows: [{ from: "card-1", to: "card-2", label: "then" }] }],
        ["draw", { arrows: [{ from: "card-1", to: "card-2" }] }],
        ["draw", { arrows: [{ from: "card-1", to: "card-1" }] }],
        ["draw", { arrows: [{ from: "card-1", to: "company" }] }],
        ["draw", { arrows: [{ from: "card-3", to: "card-2" }] }],
        ["disconnect", { id: "arrow-2" }],
        ["disconnect", { id: "arrow-2" }],
        ["settle", { ids: ["company", "card-3"] }],
        ["settle", { ids: ["ghost"] }],
      ],
      reply: "Same day?",
    },
    {
      calls: [
        [
          "draw",
          {
            cards: [
              {
                id: "card-2",
                area: "How it goes",
                title: "We send it",
                text: "Next day.",
                from: "owner",
              },
            ],
          },
        ],
        ["remove", { id: "card-9" }],
      ],
      reply: "Noted.",
    },
  ]);
  const { session, server, post, project, home } = await stage(pretend.claude);
  pretend.paths.project = project;
  pretend.paths.repo = gitRepo(home);
  try {
    await post("/api/setup/say", { text: "We are Acme." });
    const [said] = pretend.answers;
    assert.ok(said);
    assert.match(said[1] ?? "", /No git history/);
    assert.match(said[2] ?? "", /^1 changes, from \d{4}-\d\d-\d\d/);
    assert.match(said[2] ?? "", /First change/);
    assert.equal(said[3], 'Wrote "card-1".');
    assert.match(said[6] ?? "", /an area and a title/);
    assert.match(said[7] ?? "", /one short line; make more cards/);
    assert.match(said[8] ?? "", /no card or install company/);
    assert.equal(said[9], 'Drew "arrow-1".');
    assert.match(said[10] ?? "", /already points to/);
    assert.match(said[11] ?? "", /two different cards/);
    assert.match(said[12] ?? "", /no card company/);
    assert.match(said[15] ?? "", /no arrow arrow-2/);
    assert.match(said[17] ?? "", /nothing called ghost/);
    const guessed = drafted(session.state());
    assert.deepEqual(guessed.things[0], {
      id: "card-1",
      kind: "card",
      area: "How it goes",
      title: "A customer orders",
      icon: "cart",
      confirmed: false,
    });
    assert.equal(
      guessed.things[2]?.kind === "card" && guessed.things[2].confirmed,
      true,
    );
    assert.deepEqual(guessed.links, [
      { id: "arrow-1", from: "card-1", to: "card-2", label: "then" },
    ]);

    await post("/api/setup/say", { text: "No, the next day." });
    const [, second] = pretend.answers;
    assert.ok(second);
    assert.equal(second[0], "Wrote card-2 again.");
    assert.match(second[1] ?? "", /no card or install card-9/);

    // The owner moves cards, then takes the words off.
    await post("/api/setup/draft", { move: { id: "card-3", x: 1, y: 2 } });
    assert.equal(
      (await post("/api/setup/draft", { move: { id: "no", x: 0, y: 0 } }))
        .status,
      409,
    );
    assert.equal(
      (
        await post("/api/setup/draft", {
          install: { id: "card-1", answer: "approved" },
        })
      ).status,
      409,
    );
    await post("/api/setup/draft", { move: { id: "card-1", x: 5, y: 5 } });
    await post("/api/setup/draft", { remove: "card-3" });
    const after = drafted(session.state());
    assert.deepEqual(
      after.things.map((t) => t.id),
      ["card-1", "card-2"],
    );
    assert.deepEqual(after.places, { "card-1": { x: 5, y: 5 } });

    assert.equal((await post("/api/setup/make", {})).status, 200);
    const explanation = join(project, "factory", "context", "explanation");
    const page = readFileSync(join(explanation, "the-project.md"), "utf8");
    assert.match(page, /^# Acme\n/);
    assert.match(page, /\*\*Type:\*\* Explanation · Answers: /);
    assert.match(page, /Garden tools, sold online\./);
    assert.match(
      page,
      /## How it goes\n\n- \*\*A customer orders\*\* → then We send it \*\(guessed from the code\)\*\n- \*\*We send it\*\*: Next day\.\n/,
    );
    assert.doesNotMatch(page, /Rake/);
    assert.match(
      readFileSync(join(explanation, "index.md"), "utf8"),
      /\[Acme\]\(the-project\.md\)/,
    );
  } finally {
    session.close();
    server.close();
  }
});

test("one drawing writes many cards and the arrows between them, by keys, and says what did not fit", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["set_company", { name: "Acme", about: "Garden tools." }],
        [
          "draw",
          {
            cards: [
              {
                key: "order",
                area: "Ordering",
                title: "A customer orders",
                from: "code",
              },
              {
                key: "paid",
                area: "Ordering",
                title: "Paid before sending",
                tone: "rule",
                from: "owner",
              },
              { area: " ", title: "x", from: "code" },
            ],
            arrows: [
              { from: "paid", to: "order", label: "about" },
              { from: "order", to: "nowhere" },
            ],
          },
        ],
        ["focus", { ids: ["card-1"], areas: ["Ordering"] }],
        ["focus", { ids: ["ghost"] }],
        ["focus", { areas: ["Nowhere"] }],
        ["focus", {}],
      ],
      reply: "Right?",
    },
  ]);
  const { session, server, post, project } = await stage(pretend.claude);
  try {
    await post("/api/setup/say", { text: "Hi" });
    const [said] = pretend.answers;
    assert.equal(
      said?.[1],
      [
        'order: Wrote "card-1".',
        'paid: Wrote "card-2".',
        "Not drawn: Give the card an area and a title.",
        'Drew "arrow-1".',
        "Not drawn: There is no card nowhere.",
      ].join("\n"),
    );
    const draft = drafted(session.state());
    assert.deepEqual(draft.links, [
      { id: "arrow-1", from: "card-2", to: "card-1", label: "about" },
    ]);
    assert.match(said[2] ?? "", /now shows it/);
    assert.match(said[3] ?? "", /nothing called ghost/);
    assert.match(said[4] ?? "", /no area Nowhere/);
    assert.match(said[5] ?? "", /which cards or areas/);
    assert.deepEqual(draft.focus, {
      ids: ["card-1"],
      areas: ["Ordering"],
      n: 1,
    });
    await post("/api/setup/make", {});
    const page = readFileSync(
      join(project, "factory", "context", "explanation", "the-project.md"),
      "utf8",
    );
    assert.match(
      page,
      /- Rule: \*\*Paid before sending\*\* → about A customer orders\n/,
    );
  } finally {
    session.close();
    server.close();
  }
});

test("with no cards and no vision, no page is written", async () => {
  const { session, server, post, project } = await stage(
    pretendClaude([
      { calls: [["set_company", { name: "Acme", about: "" }]], reply: "Hi" },
    ]).claude,
  );
  try {
    await post("/api/setup/say", { text: "Hi" });
    await post("/api/setup/make", {});
    assert.equal(
      existsSync(
        join(project, "factory", "context", "explanation", "the-project.md"),
      ),
      false,
    );
  } finally {
    session.close();
    server.close();
  }
});

test("a picture card shows a picture from the project, which is all the page may fetch", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["set_company", { name: "Acme", about: "Garden tools." }],
        [
          "draw",
          {
            cards: [
              {
                area: "The shop",
                title: "The shop's front page",
                picture: "shop.png",
                from: "code",
              },
            ],
          },
        ],
        [
          "draw",
          {
            cards: [
              { area: "A", title: "B", picture: "../x.png", from: "code" },
            ],
          },
        ],
        [
          "draw",
          {
            cards: [
              { area: "A", title: "B", picture: "notes.txt", from: "code" },
            ],
          },
        ],
        [
          "draw",
          {
            cards: [
              { area: "A", title: "B", picture: "gone.png", from: "code" },
            ],
          },
        ],
      ],
      reply: "Like this?",
    },
  ]);
  // Written once the factory has started, so the coach does not read them
  // first.
  const { session, server, post, project, base } = await stage(pretend.claude);
  for (const [file, text] of Object.entries({
    "shop.png": "PNG",
    "other.png": "PNG",
    "notes.txt": "hi",
  }))
    writeFileSync(join(project, file), text);
  try {
    await post("/api/setup/say", { text: "Hi" });
    const [said] = pretend.answers;
    assert.ok(said);
    assert.match(said[2] ?? "", /not inside the project/);
    assert.match(said[3] ?? "", /not a picture/);
    assert.match(said[4] ?? "", /no picture gone\.png/);
    const [card] = drafted(session.state()).things;
    assert.ok(card?.kind === "card");
    assert.equal(card.picture, "shop.png");

    const shown = await fetch(`${base}/api/setup/picture?path=shop.png`);
    assert.equal(shown.status, 200);
    assert.equal(shown.headers.get("content-type"), "image/png");
    assert.equal(await shown.text(), "PNG");
    for (const path of ["other.png", "notes.txt", ""])
      assert.equal(
        (await fetch(`${base}/api/setup/picture?path=${path}`)).status,
        404,
      );

    await post("/api/setup/make", {});
    const page = readFileSync(
      join(project, "factory", "context", "explanation", "the-project.md"),
      "utf8",
    );
    assert.match(
      page,
      /- \*\*The shop's front page\*\* !\[The shop's front page\]\(\.\.\/\.\.\/\.\.\/shop\.png\) \*\(guessed/,
    );
    // Made, the factory shows no more setup pictures.
    assert.equal(
      (await fetch(`${base}/api/setup/picture?path=shop.png`)).status,
      404,
    );
  } finally {
    session.close();
    server.close();
  }
});

test("the coach proposes what to install, the owner answers, and the factory installs only what was approved", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["set_company", { name: "Acme", about: "" }],
        ["look_at_computer", {}],
        ["propose_install", { what: "hammer", why: "To build." }],
        ["propose_install", { what: "hammer", why: "Again." }],
        ["propose_install", { what: "saw", why: "To cut." }],
        ["propose_install", { what: "rocket", why: "To fly." }],
        ["propose_install", { what: "drill", why: "To drill." }],
        ["propose_install", { what: "voice", why: "To talk." }],
      ],
      reply: "I propose a hammer, a drill and voice.",
    },
  ]);
  const { session, server, post, project } = await stage(pretend.claude);
  try {
    await post("/api/setup/say", { text: "Hi" });
    const [said] = pretend.answers;
    assert.ok(said);
    assert.match(said[1] ?? "", /- hammer \(tool\): Hammer\. .*Not here yet\./);
    assert.match(said[1] ?? "", /- saw \(tool\).*On this computer already\./);
    assert.match(said[1] ?? "", /- voice \(add-on\): Voice\./);
    assert.doesNotMatch(said[1] ?? "", /trackers/);
    assert.match(said[2] ?? "", /Proposed as "install-1"/);
    assert.match(said[3] ?? "", /proposed already/);
    assert.match(said[4] ?? "", /on this computer already/);
    assert.match(said[5] ?? "", /not something the factory can install/);
    const asked = drafted(session.state()).things;
    assert.deepEqual(
      asked.map((t) => (t.kind === "install" ? [t.id, t.what, t.answer] : [])),
      [
        ["install-1", "hammer", "asked"],
        ["install-2", "drill", "asked"],
        ["install-3", "voice", "asked"],
      ],
    );

    for (const id of ["install-1", "install-2", "install-3"])
      await post("/api/setup/draft", { install: { id, answer: "approved" } });
    await post("/api/setup/draft", {
      install: { id: "install-2", answer: "declined" },
    });
    assert.equal((await post("/api/setup/make", {})).status, 200);
    const made = session.state();
    assert.ok(made.mode === "factory");
    assert.deepEqual(made.company.extensions, ["voice"]);
    assert.deepEqual(
      made.jobs.map((j) => [j.label, j.state]),
      [["Installing Hammer", "done"]],
    );
    const file = JSON.parse(
      readFileSync(join(project, "factory", "factory.json"), "utf8"),
    ) as { extensions: string[] };
    assert.deepEqual(file.extensions, ["voice"]);
  } finally {
    session.close();
    server.close();
  }
});

test("a tool the factory cannot install here says how to get it", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["set_company", { name: "Acme", about: "" }],
        ["propose_install", { what: "drill", why: "To drill." }],
      ],
      reply: "A drill.",
    },
  ]);
  const { session, server, post } = await stage(pretend.claude);
  try {
    await post("/api/setup/say", { text: "Hi" });
    await post("/api/setup/draft", {
      install: { id: "install-1", answer: "approved" },
    });
    await post("/api/setup/make", {});
    const made = session.state();
    assert.ok(made.mode === "factory");
    const [job] = made.jobs;
    assert.ok(job);
    assert.equal(job.state, "failed");
    assert.match(job.log.join(" "), /Get the drill from the shop/);
  } finally {
    session.close();
    server.close();
  }
});

test("the computer's tools: installed with the system's own package manager where there is one", () => {
  const mac = computerTools("darwin");
  assert.deepEqual(
    mac.map((t) => [t.id, t.steps]),
    [
      ["git", [["brew", "install", "git"]]],
      ["gh", [["brew", "install", "gh"]]],
    ],
  );
  assert.equal(computerTools("win32")[0]?.steps?.[0]?.[0], "winget");
  assert.equal(computerTools("linux")[0]?.steps, null);
  // Node answers on any computer that runs these tests; git may not.
  assert.equal(typeof mac[0]?.present(), "boolean");
});

// A git repository with one change, in a folder of its own.
function gitRepo(home: string): string {
  const repo = join(home, "repo");
  mkdirSync(repo);
  const git = (...args: string[]) =>
    execFileSync(GIT, ["-C", repo, ...args], { stdio: "ignore" });
  git("init", "-q");
  git(
    "-c",
    "user.name=Ann",
    "-c",
    "user.email=ann@example.com",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "First change",
  );
  git("tag", "v1");
  return repo;
}

function drafted(
  state: ReturnType<Awaited<ReturnType<typeof stage>>["session"]["state"]>,
): Draft {
  assert.ok(state.mode === "setup");
  return state.coach.draft;
}

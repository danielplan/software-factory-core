import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Session } from "../src/session.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// The setup coach: a conversation that plans the factory with the owner on
// a map, then builds it once they say so; the owner opens it.

test("the coach plans on the map, builds the factory once the owner says so, and the owner opens it", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        [
          "draw",
          {
            cards: [
              {
                key: "shop",
                area: "The project",
                title: "The shop",
                icon: "shop",
              },
              {
                key: "blog",
                area: "The project",
                title: "The blog",
                to: [{ card: "shop", label: "links to" }],
              },
            ],
            show: { areas: ["The project"] },
          },
        ],
        ["configure", { project: { name: "Acme" } }],
      ],
      reply: "Is that right?",
    },
    { calls: [], reply: "Shall I build it?" },
    {
      calls: [
        [
          "configure",
          { products: [{ name: "Shop", kind: "web-app", about: "Buy." }] },
        ],
        ["configure", { project: { name: "Acme", about: "Garden tools." } }],
        [
          "configure",
          {
            products: [
              {
                name: "Shop",
                kind: "web-app",
                about: "Where customers buy.",
                folder: "<shop>",
                users: [{ who: "Customers", does: "buy tools" }],
              },
              {
                name: "Blog",
                kind: "web-app",
                about: "News.",
                dependsOn: ["Shop"],
              },
            ],
          },
        ],
        [
          "configure",
          { products: [{ name: "Ghost", kind: "phone-app", about: "x" }] },
        ],
        [
          "configure",
          {
            products: [
              { name: "Gone", kind: "web-app", about: "x", folder: "/no/such" },
            ],
          },
        ],
        ["configure", { addOns: ["rocket"] }],
        ["configure", { tracker: "github", addOns: ["voice"] }],
        ["configure", { settings: { jira: { JIRA_TOKEN: "secret-1" } } }],
        ["configure", { settings: { jira: { JIRA_PROJECT: "ACME" } } }],
        ["configure", { project: { name: "Acme Garden" } }],
      ],
      reply: "It is built: open it when you like.",
    },
  ]);
  const { session, server, post, home, project } = await stage(pretend.claude);
  try {
    const code = join(home, "code");
    mkdirSync(join(code, "shop"), { recursive: true });
    writeFileSync(join(code, "shop", "web.txt"), "");
    pretend.paths.shop = join(code, "shop");
    const turn = (n: number) => pretend.seen[n];

    const state = session.state();
    assert.ok(state.mode === "setup");
    assert.equal(state.coach.phase, "plan");

    await post("/api/setup/say", { text: "We are Acme." });
    const planning = turn(0);
    assert.ok(planning);
    assert.equal(planning.readOnly, true);
    assert.deepEqual(planning.tools, ["Read", "Grep", "Glob"]);
    assert.ok(planning.deny?.includes("Read(**/.env*)"));
    assert.match(
      planning.instructions ?? "",
      /Help set up\.[\s\S]*`web-app`[\s\S]*`hammer` \(tool\)/,
    );
    const [drew] = pretend.answers;
    assert.ok(drew);
    assert.match(
      drew[0] ?? "",
      /^shop = card-1\nblog = card-2\ncard-2 → card-1\nShown to the owner\.\n\nCards:\n- card-1 \[The project\] \(guess\): The shop/,
    );
    assert.match(drew[1] ?? "", /Plan with the owner first/);
    const map = session.state();
    assert.ok(map.mode === "setup");
    assert.deepEqual(map.coach.draft.focus, {
      ids: [],
      areas: ["The project"],
      n: 1,
    });

    // The owner moves a card and takes one off; the coach hears of it.
    await post("/api/setup/draft", { move: { id: "card-1", x: 1, y: 2 } });
    await post("/api/setup/draft", {
      move: { id: "area:The project", x: 0, y: 0 },
    });
    await post("/api/setup/draft", { remove: "card-2" });
    assert.equal(
      (await post("/api/setup/draft", { remove: "nothing" })).status,
      409,
    );
    await post("/api/setup/say", {
      text: "Sieht gut aus.",
      spokenIn: "Deutsch",
    });
    assert.match(
      turn(1)?.prompt ?? "",
      /^Sieht gut aus\.\n\n\(I changed the canvas myself; look at it\. Said out loud, in Deutsch: answer in Deutsch, for being read aloud\.\)$/,
    );
    assert.equal(turn(1)?.session?.resume, true);

    assert.equal((await post("/api/setup/build", {})).status, 200);
    const building = turn(2);
    assert.ok(building);
    assert.equal(building.readOnly, false);
    assert.deepEqual(building.tools, ["Read", "Grep", "Glob", "Write", "Edit"]);
    assert.ok(building.deny?.includes("Write(**/.env*)"));
    assert.match(building.prompt, /^Build the factory now/);
    const [, , built] = pretend.answers;
    assert.ok(built);
    assert.match(built[0] ?? "", /Give the project first/);
    assert.match(built[1] ?? "", /Made the factory's folder/);
    assert.match(built[2] ?? "", /^Added Shop, Blog\.\n/);
    assert.match(built[2] ?? "", /The factory's checks/);
    assert.match(built[3] ?? "", /No kit knows a phone-app/);
    assert.match(built[4] ?? "", /does not recognise \/no\/such/);
    assert.match(built[5] ?? "", /no add-on rocket/);
    assert.match(built[6] ?? "", /Saved where work is tracked/);
    assert.match(built[7] ?? "", /Saved the settings jira/);
    assert.match(built[8] ?? "", /Settings jira not saved: JIRA_PROJECT/);
    assert.match(built[9] ?? "", /Changed the project/);

    // Built, the page stays in setup until the owner opens the factory.
    const ready = session.state();
    assert.ok(ready.mode === "setup");
    assert.equal(ready.coach.phase, "build");
    assert.equal(ready.coach.made, true);
    assert.deepEqual(ready.coach.messages.map((m) => m.text).slice(-2), [
      "Build the factory.",
      "It is built: open it when you like.",
    ]);
    assert.equal((await post("/api/setup/open", {})).status, 200);
    const made = session.state();
    assert.ok(made.mode === "factory");
    assert.equal(made.company.name, "Acme Garden");
    assert.equal(made.company.about, "Garden tools.");
    assert.equal(made.company.tracker, "github");
    // Just opened, connecting where work is tracked comes first.
    assert.equal(made.onboarding, true);
    assert.deepEqual(made.company.extensions, ["voice"]);
    const blog = made.products.find((p) => p.id === "blog");
    assert.equal(blog?.folder, join(project, "blog"));
    assert.ok(existsSync(join(project, "blog")));
    const shop = made.products.find((p) => p.id === "shop");
    assert.deepEqual(shop?.users, [{ who: "Customers", does: "buy tools" }]);
    assert.ok(
      existsSync(join(project, "factory", "products", "shop", "BLUEPRINT.md")),
    );
    assert.equal(
      (await post("/api/setup/draft", { remove: "card-1" })).status,
      409,
    );
    assert.equal((await post("/api/setup/build", {})).status, 409);
    assert.equal((await post("/api/setup/open", {})).status, 200);
  } finally {
    session.close();
    server.close();
  }
});

test("opening a factory before there is one is refused", async () => {
  const { session, server, post } = await stage();
  try {
    assert.equal((await post("/api/setup/open", {})).status, 409);
  } finally {
    session.close();
    server.close();
  }
});

test("only the coach's Claude Code uses its tools, and a missing Claude Code is said plainly", async () => {
  const pretend = pretendClaude([]);
  const { session, server, post, base } = await stage(pretend.claude);
  try {
    const tools = await fetch(`${base}/api/setup/mcp`, {
      method: "POST",
      headers: { "x-setup-coach": "guess" },
      body: "{}",
    });
    assert.equal(tools.status, 403);
    assert.equal((await post("/api/setup/say", { text: " " })).status, 409);
    await post("/api/setup/say", { text: "Hello" });
    const state = session.state();
    assert.ok(state.mode === "setup");
    assert.match(
      state.coach.problem ?? "",
      /Claude Code is not on this computer/,
    );
    assert.equal(state.coach.working, false);
    // The next try starts a fresh conversation.
    await post("/api/setup/say", { text: "Hello?" });
    const [one, two] = pretend.seen;
    assert.notEqual(one?.session?.id, two?.session?.id);
    assert.equal(two?.session?.resume, false);
  } finally {
    session.close();
    server.close();
  }
});

test("started in a project with code, the coach reads it first, before the owner says anything", async () => {
  const pretend = pretendClaude([
    {
      calls: [["draw", { cards: [{ title: "A shop" }] }]],
      reply: "This looks like a shop. Who buys from it?",
    },
  ]);
  const { session, server, project } = await stage(pretend.claude, {
    "web.txt": "",
  });
  pretend.paths.project = project;
  try {
    const coach = await answered(session);
    const [opening] = pretend.seen;
    assert.equal(opening?.prompt, `Here's my project: ${project}`);
    assert.equal(opening.cwd, project);
    assert.match(
      opening.instructions ?? "",
      /started the factory in their project's folder/,
    );
    // The owner sees the coach's answer, not the words that started it.
    assert.deepEqual(coach.messages, [
      { from: "coach", text: "This looks like a shop. Who buys from it?" },
    ]);
    assert.equal(coach.started, true);
    assert.match(pretend.answers[0]?.[0] ?? "", /^card-1\n/);
  } finally {
    session.close();
    server.close();
  }
});

test("when reading the project did not work, the owner's next message asks for it again", async () => {
  const pretend = pretendClaude([]);
  const { session, server, post, project } = await stage(pretend.claude, {
    "web.txt": "",
  });
  try {
    assert.match(
      (await answered(session)).problem ?? "",
      /not on this computer/,
    );
    await post("/api/setup/say", { text: "Hello?" });
    assert.equal(
      pretend.seen[1]?.prompt,
      `Here's my project: ${project}\n\nHello?`,
    );
  } finally {
    session.close();
    server.close();
  }
});

// The coach's view once its first turn is over.
async function answered(session: Session) {
  for (;;) {
    const state = session.state();
    assert.ok(state.mode === "setup");
    if (state.coach.started && !state.coach.working) return state.coach;
    await new Promise((resolve) => setImmediate(resolve));
  }
}

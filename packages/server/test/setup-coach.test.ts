import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Session } from "../src/session.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// The setup coach: a conversation that draws the company on a canvas with
// its tools, which the owner can change too, and which becomes the factory.

test("the coach puts the company and its products on the canvas while they talk, then the factory is made from it", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["set_company", { name: "Acme", about: "Garden tools, online." }],
        ["look_for_products", { folder: "<code>" }],
        [
          "add_product",
          {
            name: "Shop",
            kind: "web-app",
            about: "Where customers buy.",
            users: [{ who: "Customers", does: "buy tools" }],
            folder: "<shop>",
          },
        ],
        ["write_blueprint", { id: "shop", markdown: "# Shop blueprint\n" }],
        [
          "add_product",
          {
            name: "Blog",
            kind: "web-app",
            about: "News.",
            dependsOn: ["shop"],
          },
        ],
        ["add_product", { name: "Ghost", kind: "phone-app", about: "" }],
        [
          "add_product",
          { name: "Gone", kind: "web-app", about: "", folder: "/no/such" },
        ],
      ],
      reply: "I found your shop and added a blog. Does that look right?",
    },
    {
      calls: [
        ["look_at_canvas", {}],
        ["change_product", { id: "blog", about: "Our news." }],
        ["set_company", { name: "Acme Garden" }],
      ],
      reply: "Got it.",
    },
  ]);
  const {
    session,
    server,
    post,
    home: folder,
    project,
  } = await stage(pretend.claude);
  try {
    const code = join(folder, "code");
    mkdirSync(join(code, "shop"), { recursive: true });
    writeFileSync(join(code, "shop", "web.txt"), "");
    pretend.paths.code = code;
    pretend.paths.shop = join(code, "shop");
    const first = (turn: number) => pretend.seen[turn];

    const state = session.state();
    assert.ok(state.mode === "setup");
    assert.equal(state.coach.messages[0]?.from, "coach");

    const said = await post("/api/setup/say", { text: "We are Acme." });
    assert.equal(said.status, 200);
    const asked = first(0);
    assert.ok(asked);
    assert.equal(asked.readOnly, true);
    assert.deepEqual(asked.tools, ["Read", "Grep", "Glob"]);
    assert.ok(asked.deny?.includes("Read(**/.env*)"));
    assert.match(asked.instructions ?? "", /Help set up\.[\s\S]*`web-app`/);
    assert.equal(asked.session?.resume, false);

    const [answers] = pretend.answers;
    assert.ok(answers);
    assert.match(answers[1] ?? "", /"id": "shop"/);
    assert.equal(answers[2], 'Added Shop as "shop".');
    // A kind no kit knows is refused by the tool's own schema.
    assert.match(answers[5] ?? "", /expected "web-app"/);
    assert.match(answers[6] ?? "", /There is no folder/);

    const drafted = session.state();
    assert.ok(drafted.mode === "setup");
    assert.deepEqual(drafted.coach.draft.company, {
      name: "Acme",
      about: "Garden tools, online.",
      settled: false,
    });
    assert.deepEqual(
      drafted.coach.draft.products.map((p) => [
        p.id,
        p.isNew,
        p.port,
        p.dependsOn,
      ]),
      [
        ["shop", false, 5173, []],
        ["blog", true, 5174, ["shop"]],
      ],
    );
    assert.deepEqual(
      drafted.coach.messages.map((m) => m.from),
      ["coach", "owner", "coach"],
    );
    assert.equal(drafted.coach.working, false);

    // The owner moves a card (what a card says, they change by talking:
    // that is refused); the coach hears of it next turn.
    await post("/api/setup/draft", { move: { id: "blog", x: 1, y: 1 } });
    assert.equal(
      (await post("/api/setup/draft", { company: { name: "Acme Garden" } }))
        .status,
      409,
    );
    assert.equal(
      (await post("/api/setup/draft", { remove: "nothing" })).status,
      409,
    );
    await post("/api/setup/say", {
      text: "Sieht gut aus.",
      spokenIn: "Deutsch",
    });
    const second = first(1);
    assert.ok(second);
    assert.match(
      second.prompt,
      /^Sieht gut aus\.\n\n\(I changed the canvas myself; look at it\. Said out loud, in Deutsch: answer in Deutsch, for being read aloud\.\)$/,
    );
    assert.equal(second.session?.resume, true);

    assert.equal((await post("/api/setup/make", {})).status, 200);
    const root = join(project, "factory");
    const made = session.state();
    assert.ok(made.mode === "factory");
    assert.equal(made.company.name, "Acme Garden");
    const blog = made.products.find((p) => p.id === "blog");
    assert.ok(blog);
    assert.equal(blog.about, "Our news.");
    assert.equal(blog.folder, join(project, "blog"));
    assert.ok(existsSync(join(project, "blog")));
    const shop = made.products.find((p) => p.id === "shop");
    assert.deepEqual(shop?.users, [{ who: "Customers", does: "buy tools" }]);
    assert.equal(
      readFileSync(join(root, "products", "shop", "BLUEPRINT.md"), "utf8"),
      "# Shop blueprint\n",
    );
    assert.equal(
      (await post("/api/setup/draft", { remove: "shop" })).status,
      409,
    );
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
      calls: [["look_for_products", { folder: "<project>" }]],
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
    assert.match(pretend.answers[0]?.[0] ?? "", /web/i);
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

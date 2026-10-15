import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Claude, RunOptions } from "@software-factory/core";

import { stage } from "./stage.ts";

// The setup coach: a conversation that draws the company on a map with its
// tools, which the owner can change too, and which becomes the factory.

type Call = [string, Record<string, unknown>];

// A pretend Claude Code: each turn calls the tools it is given over MCP,
// as the real one does, then answers. "<name>" in an argument is the path
// set in `paths` by then.
function pretendClaude(turns: { calls: Call[]; reply: string }[]) {
  const paths: Record<string, string> = {};
  const filled = (args: Record<string, unknown>) =>
    JSON.parse(
      JSON.stringify(args).replace(/<(\w+)>/g, (_, name: string) =>
        JSON.stringify(paths[name] ?? "").slice(1, -1),
      ),
    ) as Record<string, unknown>;
  const seen: RunOptions[] = [];
  const answers: string[][] = [];
  const claude: Claude = {
    async run(options) {
      seen.push(options);
      const turn = turns[seen.length - 1];
      if (!turn) return { ok: false, text: "", error: "spawn claude ENOENT" };
      const mcp = options.mcp;
      assert.ok(mcp);
      const client = new Client({ name: "pretend", version: "1.0.0" });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(mcp.url), {
          requestInit: { headers: mcp.headers },
        }),
      );
      const said: string[] = [];
      for (const [name, args] of turn.calls) {
        options.onActivity(`Using mcp__setup__${name}`);
        const result = (await client.callTool({
          name,
          arguments: filled(args),
        })) as {
          content: { text: string }[];
        };
        said.push(result.content.map((c) => c.text).join(""));
      }
      await client.close();
      answers.push(said);
      options.onText?.(turn.reply.slice(0, 5));
      return { ok: true, text: turn.reply };
    },
  };
  return { claude, seen, answers, paths };
}

test("the coach puts the company and its products on the map while they talk, then the factory is made from it", async () => {
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
    { calls: [["look_at_map", {}]], reply: "Got it." },
  ]);
  const { session, server, post, home: folder } = await stage(pretend.claude);
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

    // The owner changes the map; the coach hears of it next turn.
    await post("/api/setup/draft", {
      product: { id: "blog", about: "Our news." },
    });
    await post("/api/setup/draft", { company: { name: "Acme Garden" } });
    assert.equal(
      (await post("/api/setup/draft", { remove: "nothing" })).status,
      409,
    );
    await post("/api/setup/say", { text: "Looks good." });
    const second = first(1);
    assert.ok(second);
    assert.match(second.prompt, /I changed the map myself/);
    assert.equal(second.session?.resume, true);

    assert.equal((await post("/api/setup/make", {})).status, 200);
    const root = join(folder, "Factories", "acme-garden");
    const made = session.state();
    assert.ok(made.mode === "factory");
    assert.equal(made.company.name, "Acme Garden");
    const blog = made.products.find((p) => p.id === "blog");
    assert.ok(blog);
    assert.equal(blog.about, "Our news.");
    assert.equal(blog.folder, join(root, "code", "blog"));
    assert.ok(existsSync(join(root, "code", "blog")));
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

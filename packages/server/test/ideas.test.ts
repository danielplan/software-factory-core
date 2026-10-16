import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { Ideas } from "../src/coach/ideas.ts";
import type { Session } from "../src/session.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// The factory's ideas: each a conversation with the idea coach about a
// map, kept as a file in the factory's ideas/ folder, marked ready once
// agreed, or discarded.

test("an idea is worked out with the coach on its map, kept in the factory, marked ready and discarded", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        [
          "draw",
          {
            cards: [
              {
                key: "who",
                area: "Who",
                title: "Gardeners",
                picture: "shop.png",
              },
              {
                area: "Who",
                title: "Paid first",
                tone: "rule",
                to: [{ card: "who" }],
              },
            ],
            show: { areas: ["Who"] },
            title: "Gardeners' wish list",
          },
        ],
        ["configure", { project: { name: "Nope" } }],
      ],
      reply: "Who is it for?",
    },
    { calls: [], reply: "Then it is ready." },
  ]);
  const { session, server, post, project, base } = await stage(pretend.claude);
  try {
    assert.equal((await post("/api/ideas", { text: "Hi" })).status, 409);
    await post("/api/company", { name: "Acme", about: "" });
    writeFileSync(join(project, "shop.png"), "PNG");
    const made = await post("/api/ideas", {
      text: "A wish list for gardeners, so they can save the tools they like for later",
    });
    const { id } = (await made.json()) as { id: string };
    const idea = await answered(session, id);
    assert.equal(idea.title, "Gardeners' wish list");
    assert.equal(idea.status, "draft");
    assert.deepEqual(
      idea.messages.map((m) => m.from),
      ["owner", "coach"],
    );
    assert.equal(pretend.seen[0]?.readOnly, true);
    assert.equal(pretend.seen[0].instructions, "Shape the idea.");
    assert.match(
      pretend.answers[0]?.[0] ?? "",
      /^who = card-1\ncard-2\ncard-2 → card-1\nShown/,
    );
    assert.match(
      pretend.answers[0]?.[1] ?? "",
      /Unknown tool|not found|configure/i,
    );
    assert.deepEqual(idea.draft.focus.areas, ["Who"]);

    // The picture an idea's card shows is served; the owner moves a card.
    assert.equal(
      (await fetch(`${base}/api/setup/picture?path=shop.png`)).status,
      200,
    );
    await post("/api/ideas/draft", { id, move: { id: "card-2", x: 1, y: 1 } });
    await post("/api/ideas/draft", { id, remove: "card-2" });
    await post("/api/ideas/say", { id, text: "For gardeners." });
    assert.match(pretend.seen[1]?.prompt ?? "", /I changed the canvas myself/);
    assert.equal(pretend.seen[1]?.session?.resume, true);

    const file = join(project, "factory", "ideas", `${id}.json`);
    const kept = JSON.parse(readFileSync(file, "utf8")) as {
      messages: unknown[];
      map: { cards: unknown[] };
    };
    assert.equal(kept.messages.length, 4);
    assert.equal(kept.map.cards.length, 1);

    // Read back as it was, on another start.
    const again = new Ideas({
      claude: pretend.claude,
      root: join(project, "factory"),
      project,
      guide: "",
      onChange: () => {},
    });
    assert.deepEqual(
      again.list().map((i) => [i.id, i.messages.length]),
      [[id, 4]],
    );

    await post("/api/ideas/ready", { id });
    assert.equal(ideasOf(session)[0]?.status, "ready");
    assert.equal((await post("/api/ideas/ready", { id: "nope" })).status, 409);
    await post("/api/ideas/discard", { id });
    assert.deepEqual(ideasOf(session), []);
    assert.equal(existsSync(file), false);
    assert.equal(
      (await post("/api/ideas/say", { id, text: "Hi" })).status,
      409,
    );
    assert.equal((await post("/api/ideas", { text: " " })).status, 409);
  } finally {
    session.close();
    server.close();
  }
});

test("an idea's tools answer only its own coach, and only for an idea that is there", async () => {
  const { session, server, post, base } = await stage(pretendClaude([]).claude);
  try {
    await post("/api/company", { name: "Acme", about: "" });
    const made = await post("/api/ideas", {
      text: "Gift cards for every season sent by email",
    });
    const { id } = (await made.json()) as { id: string };
    // Its first words, until the coach gives it a title.
    assert.deepEqual(
      ideasOf(session).map((idea) => idea.title),
      ["Gift cards for every season sent…"],
    );
    const call = (path: string, token: string) =>
      fetch(`${base}${path}`, {
        method: "POST",
        headers: { "x-setup-coach": token },
        body: "{}",
      });
    assert.equal((await call(`/api/ideas/mcp/${id}`, "guess")).status, 403);
    assert.equal((await call("/api/ideas/mcp/nope", "guess")).status, 404);
  } finally {
    session.close();
    server.close();
  }
});

function ideasOf(session: Session) {
  const state = session.state();
  assert.ok(state.mode === "factory");
  return state.ideas;
}

async function answered(session: Session, id: string) {
  for (;;) {
    const idea = ideasOf(session).find((i) => i.id === id);
    if (idea && !idea.working && idea.messages.length > 1) return idea;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

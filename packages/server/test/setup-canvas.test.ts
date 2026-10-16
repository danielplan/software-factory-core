import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Draft } from "../src/api.ts";
import { computerTools } from "../src/installables.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// The map the coach plans with the owner: cards drawn, drawn again, joined,
// taken off and shown, pictures from the project; and, once building, what
// it installs on this computer.

test("one drawing draws cards and arrows by keys, draws again by id, takes off and shows, and says what did not fit", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        [
          "draw",
          {
            cards: [
              {
                key: "order",
                area: "Ordering",
                title: "A customer orders",
                icon: "cart",
              },
              {
                key: "paid",
                area: "Ordering",
                title: "Paid before sending",
                tone: "rule",
                confirmed: true,
                to: [{ card: "order", label: "about" }, { card: "nowhere" }],
              },
              {
                key: "note",
                title: "Same day?",
                text: "Maybe.",
                tone: "question",
              },
              { title: " " },
              { title: "Long", text: "y".repeat(161) },
              { id: "card-9", title: "Ghost" },
              { title: "Self", to: [{ card: "order" }] },
            ],
          },
        ],
        [
          "draw",
          {
            cards: [
              {
                id: "card-1",
                area: "Ordering",
                title: "A customer orders",
                confirmed: true,
              },
            ],
            disconnect: [
              { from: "card-2", to: "card-1" },
              { from: "card-3", to: "card-1" },
            ],
            remove: ["card-3", "card-3"],
            show: { cards: ["card-1"], areas: ["Ordering"] },
          },
        ],
        ["draw", { show: { areas: ["Nowhere"] } }],
        [
          "draw",
          {
            cards: [
              { title: "x", to: [{ card: "card-1" }, { card: "card-1" }] },
            ],
          },
        ],
        [
          "draw",
          {
            cards: [
              {
                id: "card-1",
                area: "Ordering",
                title: "A customer orders",
                confirmed: true,
                to: [{ card: "card-1" }],
              },
            ],
          },
        ],
        ["draw", {}],
      ],
      reply: "Like this?",
    },
  ]);
  const { session, server, post } = await stage(pretend.claude);
  try {
    await post("/api/setup/say", { text: "Hi" });
    const [said] = pretend.answers;
    assert.ok(said);
    assert.equal(
      said[0]?.split("\n\n")[0],
      [
        "order = card-1",
        "paid = card-2",
        "note = card-3",
        "Not drawn: Give the card a title.",
        "Not drawn: Keep a card's text to a line or two; make more cards.",
        "Not drawn: There is no card card-9.",
        "card-4",
        "card-2 → card-1",
        "Not drawn: There is no card nowhere.",
        "card-4 → card-1",
      ].join("\n"),
    );
    assert.match(
      said[0],
      /- card-2 \[Ordering\] \(rule\): Paid before sending\n- card-3 \(question\) \(guess\): Same day\? — Maybe\./,
    );
    assert.match(said[0], /Arrows:\n- card-2 → card-1 \(about\)/);
    assert.match(
      said[1] ?? "",
      /Took off card-2 → card-1\nNot drawn: There is no arrow from card-3 to card-1\.\nTook off card-3\nNot drawn: There is no card card-3\.\nShown to the owner\./,
    );
    assert.match(said[2] ?? "", /Not drawn: There is no area Nowhere\./);
    // A taken-off card's id is free again; the same arrow twice is one.
    assert.match(said[3] ?? "", /^card-3\ncard-3 → card-1\ncard-3 → card-1\n/);
    assert.match(
      said[4] ?? "",
      /Not drawn: An arrow joins two different cards\./,
    );
    assert.match(said[5] ?? "", /^Cards:/);
    const draft = drafted(session.state());
    assert.deepEqual(draft.cards[0], {
      id: "card-1",
      area: "Ordering",
      title: "A customer orders",
      confirmed: true,
    });
    assert.deepEqual(draft.links, [
      { id: "arrow-2", from: "card-4", to: "card-1", label: "" },
      { id: "arrow-1", from: "card-3", to: "card-1", label: "" },
    ]);
    assert.deepEqual(draft.focus, {
      ids: ["card-1"],
      areas: ["Ordering"],
      n: 1,
    });
  } finally {
    session.close();
    server.close();
  }
});

test("an empty map says so", async () => {
  const pretend = pretendClaude([{ calls: [["draw", {}]], reply: "Hi" }]);
  const { session, server, post } = await stage(pretend.claude);
  try {
    await post("/api/setup/say", { text: "Hi" });
    assert.equal(pretend.answers[0]?.[0], "The map is empty.");
  } finally {
    session.close();
    server.close();
  }
});

test("a picture card shows a picture from the project, which is all the page may fetch", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        [
          "draw",
          {
            cards: [
              { title: "The shop's front page", picture: "shop.png" },
              { title: "B", picture: "../x.png" },
              { title: "B", picture: "notes.txt" },
              { title: "B", picture: "gone.png" },
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
    const answer = pretend.answers[0]?.[0] ?? "";
    assert.match(answer, /not inside the project/);
    assert.match(answer, /not a picture/);
    assert.match(answer, /no picture gone\.png/);
    assert.equal(drafted(session.state()).cards[0]?.picture, "shop.png");

    const shown = await fetch(`${base}/api/setup/picture?path=shop.png`);
    assert.equal(shown.status, 200);
    assert.equal(shown.headers.get("content-type"), "image/png");
    assert.equal(await shown.text(), "PNG");
    for (const path of ["other.png", "notes.txt", ""])
      assert.equal(
        (await fetch(`${base}/api/setup/picture?path=${path}`)).status,
        404,
      );
  } finally {
    session.close();
    server.close();
  }
});

test("building, the coach installs tools and switches on add-ons; one it cannot install here says how to get it", async () => {
  const pretend = pretendClaude([
    { calls: [], reply: "Shall I build it?" },
    {
      calls: [
        ["configure", { project: { name: "Acme" } }],
        ["configure", { install: ["hammer"] }],
        ["configure", { install: ["drill"] }],
      ],
      reply: "Built.",
    },
  ]);
  const { session, server, post, project } = await stage(pretend.claude);
  try {
    await post("/api/setup/say", { text: "Hi" });
    await post("/api/setup/build", {});
    const [, built] = pretend.answers;
    assert.ok(built);
    assert.match(built[1] ?? "", /^Installed hammer\./);
    assert.match(built[2] ?? "", /^Not everything could be installed/);
    const state = session.state();
    assert.ok(state.mode === "setup");
    assert.deepEqual(
      state.jobs.map((j) => [j.label, j.state]),
      [
        ["Installing Hammer", "done"],
        ["Installing Drill", "failed"],
      ],
    );
    assert.match(
      state.jobs[1]?.log.join(" ") ?? "",
      /Get the drill from the shop/,
    );
    assert.ok(existsSync(join(project, "factory", "factory.json")));
    assert.match(readFileSync(join(project, "AGENTS.md"), "utf8"), /factory/);
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
function drafted(
  state: ReturnType<Awaited<ReturnType<typeof stage>>["session"]["state"]>,
): Draft {
  assert.ok(state.mode === "setup");
  return state.coach.draft;
}

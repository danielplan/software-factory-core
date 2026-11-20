import assert from "node:assert/strict";
import { test } from "node:test";

import { explorationsFactory } from "./explorations-factory.ts";
import { inGit } from "./git-project.ts";

// A new exploration opened at once, and a prototype as a frame of
// versions: a change made from the one before, another way beside it.

test("New exploration opens a fresh one at once, waits for the idea, and opens the untouched one again", async () => {
  const factory = await explorationsFactory();
  try {
    const first = (await factory.press("/fresh")).body.exploration as {
      id: string;
      status: string;
      problem: string;
      title: string;
    };
    assert.equal(first.status, "exploring");
    assert.equal(first.problem, "");
    assert.equal(first.title, "New idea");
    await factory.press("/start", { id: first.id });
    assert.equal(factory.seen.length, 0);
    const again = (await factory.press("/fresh")).body.exploration as {
      id: string;
    };
    assert.equal(again.id, first.id);
  } finally {
    factory.close();
  }
});

test("a change is a new version made from the one before, which stays; another way is made beside it", async () => {
  const factory = await explorationsFactory([
    {
      calls: [
        ["change_prototype", { prototype: "A", change: "A bigger button" }],
        [
          "another_way",
          { prototype: "A", name: "A list", difference: "As a list" },
        ],
      ],
      reply: "Making both.",
    },
    { calls: [], reply: "Made A2." },
    { calls: [], reply: "Made A3." },
  ]);
  try {
    inGit(factory.project);
    await factory.press("/say", { id: "X-1", text: "Bigger, or a list?" });
    await factory.settled("X-1");
    const board = factory.store.board("X-1");
    const version = (key: string) =>
      board.things.find((t) => t.kind === "prototype" && t.key === key);
    const changed = version("A2");
    const other = version("A3");
    assert.ok(changed?.kind === "prototype" && other?.kind === "prototype");
    assert.equal(changed.frame, "prototype-a");
    assert.equal(changed.from, "A");
    assert.equal(changed.difference, "A bigger button");
    assert.equal(other.frame, "prototype-a");
    assert.equal(other.from, undefined);
    assert.equal(other.name, "A list");
    assert.ok(version("A"));
    assert.match(
      factory.answers[0]?.[0] ?? "",
      /Making A2, a new version of A/,
    );
    assert.match(factory.answers[0]?.[1] ?? "", /Making A3, another way/);
    assert.match(
      (await factory.page("X-1")).talk.messages.at(-1)?.text ?? "",
      /Making both/,
    );
  } finally {
    factory.close();
  }
});

import assert from "node:assert/strict";
import { cpSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import type { SupportView } from "../src/kobble/support.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { kobbleStage } from "./stage.ts";

// New persona and New exploration open the support kobold's conversation:
// it asks, says back what it will add, and adds it with its own tools.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

test("the support kobold adds the persona and the exploration the team describes to it", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["list_personas", {}],
        [
          "add_persona",
          {
            name: "Ana",
            place: "Bakery, Milan",
            about: "Runs a small bakery and orders flour every week.",
          },
        ],
        [
          "add_exploration",
          {
            title: "Weekly flour order",
            problem: "Ana forgets to reorder flour until she runs out.",
            persona: "ana",
          },
        ],
        [
          "add_exploration",
          { title: "Nobody", problem: "None", persona: "nobody" },
        ],
      ],
      reply: "Added Ana and the idea; it waits in Explorations.",
    },
  ]);
  // With Kobble's own extensions, whose plugs Sprocket hears.
  const staged = await kobbleStage(pretend.claude);
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  try {
    const said = await staged.post("/api/kobble/support", {
      text: "I'd like to add a new persona.",
      page: "personas",
    });
    assert.equal(said.status, 200);
    for (;;) {
      const view = (await (
        await fetch(`${staged.base}/api/kobble/support`)
      ).json()) as SupportView;
      if (view.writing === null && view.messages.length === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const store = new KobbleStore(root);
    assert.equal(store.get("personas", "ana")?.place, "Bakery, Milan");
    const added = store
      .all("explorations")
      .find((one) => one.title === "Weekly flour order");
    assert.ok(added);
    assert.deepEqual(added.personas, ["ana"]);
    assert.equal(added.status, "waiting");
    assert.ok(!store.all("explorations").some((one) => one.title === "Nobody"));
    // It saw the personas there were, and why the last one was refused.
    const answers = pretend.answers[0] ?? [];
    assert.match(answers[0] ?? "", /noah/);
    assert.match(answers[3] ?? "", /no persona “nobody”/);

    const refused = await fetch(`${staged.base}/api/kobble/support/mcp`, {
      method: "POST",
      body: "{}",
    });
    assert.equal(refused.status, 403);
  } finally {
    staged.session.close();
    staged.server.close();
  }
});

test("Sprocket hands work on to the other kobolds and takes the person there; it does nothing alone", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        ["list_explorations", {}],
        ["list_new_signals", {}],
        [
          "explore_with_doodle",
          {
            title: "Flour reminders",
            problem: "Bakers run out of flour before they reorder.",
          },
        ],
        ["go_to", { place: "#releases" }],
        ["go_to", { place: "somewhere else" }],
        ["tell_doodle", { exploration: "X-1", words: "Keep it to one tap." }],
        ["send_signal", { id: "S-0002", to: "doodle" }],
      ],
      reply: "Handed on.",
    },
    // Doodle, opening the new exploration and hearing the passed-on words.
    { calls: [], reply: "Here is the picture." },
    { calls: [], reply: "One tap it is." },
    { calls: [], reply: "Looking at the signal." },
  ]);
  // With Kobble's own extensions, whose plugs Sprocket hears.
  const staged = await kobbleStage(pretend.claude);
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  try {
    await staged.post("/api/kobble/support", {
      text: "I have an idea, and a word for Doodle.",
      page: "home",
    });
    let view: SupportView;
    for (;;) {
      view = (await (
        await fetch(`${staged.base}/api/kobble/support`)
      ).json()) as SupportView;
      if (view.writing === null && view.messages.length === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    // Doodle's turns may end first: Sprocket's is the one with seven calls.
    const answers = pretend.answers.find((one) => one.length === 7) ?? [];
    assert.match(answers[0] ?? "", /X-1: /);
    assert.match(answers[1] ?? "", /S-0002 /);
    const store = new KobbleStore(root);
    const idea = store
      .all("explorations")
      .find((one) => one.title === "Flour reminders");
    assert.ok(idea);
    // Started with Doodle, not parked.
    assert.equal(idea.status, "exploring");
    assert.match(
      answers[2] ?? "",
      /Handed to Doodle\. They are now at #explore\/X-/,
    );
    assert.match(answers[3] ?? "", /now at #releases/);
    assert.match(answers[4] ?? "", /not a place in Kobble/);
    assert.match(
      answers[5] ?? "",
      /Told Doodle\. They are now at #explore\/X-1/,
    );
    assert.equal(store.get("signals", "S-0002")?.status, "explored");
    // The page follows each move once: the last one, counted.
    const { went } = view;
    assert.ok(went);
    assert.equal(went.n, 4);
    assert.match(went.to, /^#explore\/X-\d+$/);
  } finally {
    staged.session.close();
    staged.server.close();
  }
});

import assert from "node:assert/strict";
import { cpSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import type { SupportView } from "../src/kobble/support.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

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
  const staged = await stage(pretend.claude);
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

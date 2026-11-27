import assert from "node:assert/strict";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import { type Cards, planOf } from "../src/cards/cards.ts";
import { fixSignal } from "../src/extensions/signals/actions.ts";
import {
  type FixPlan,
  planFix,
  planText,
} from "../src/extensions/signals/fix-plan.ts";
import { standIn } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// Fix, with a plan first: the builder takes a quick, read-only look and
// says what it would do; the card is made with that plan as its agreed
// plan, and only once.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

const PLAN: FixPlan = {
  title: "The basket keeps its gloves",
  happens: "The basket is empty when Mia comes back.",
  cause: "The basket lives only in the page (`shop/basket.ts`).",
  change: ["Keep the basket with the customer", "Show it again on return"],
  check: "Mia closes the shop, opens it again, and the gloves are there.",
};

function acmeStore(): KobbleStore {
  const folder = mkdtempSync(join(tmpdir(), "fix-plan-"));
  cpSync(join(ACME, "factory", "kobble"), join(folder, "kobble"), {
    recursive: true,
  });
  return new KobbleStore(folder);
}

test("the builder looks read-only and says its plan; a correction goes with the plan before", async () => {
  const store = acmeStore();
  const signal = store.get("signals", "S-0002");
  const test = store.get("tests", "T-0001");
  assert.ok(signal && test);
  const { claude, seen } = standIn([
    `I looked. ${JSON.stringify(PLAN)}`,
    JSON.stringify({ ...PLAN, title: "Gloves stay" }),
    "no plan",
    null,
  ]);
  const options = { claude, project: store.root };
  const withStep = {
    ...signal,
    step: { test: "T-0001", number: 3, did: "Closed the shop" },
  };
  assert.deepEqual(await planFix(options, { signal: withStep, test }), PLAN);
  const [first] = seen;
  assert.ok(first);
  assert.equal(first.readOnly, true);
  assert.deepEqual(first.tools, ["Read", "Grep", "Glob"]);
  assert.match(first.prompt, /I put gloves in the basket/);
  assert.match(first.prompt, /moment 3/);
  assert.match(first.prompt, /They expected: The gloves are still/);
  assert.match(first.prompt, /They said: The basket was empty\./);
  const again = await planFix(options, {
    signal,
    test: null,
    before: PLAN,
    correction: "Call it Gloves stay",
  });
  assert.equal(again.title, "Gloves stay");
  assert.match(seen[1]?.prompt ?? "", /The team's correction:\nCall it/);
  await assert.rejects(
    planFix(options, { signal, test: null }),
    /The builder's plan could not be read/,
  );
  await assert.rejects(
    planFix(options, { signal, test: null }),
    /The builder could not look at it: spawn claude ENOENT/,
  );
});

test("Fix with a plan makes the card once, with the plan as its agreed plan", async () => {
  const store = acmeStore();
  const made: { title: string; body: string }[] = [];
  let answer = () => {};
  const cards = {
    create: async (title: string, body: string) => {
      made.push({ title, body });
      await new Promise<void>((resolve) => {
        answer = resolve;
      });
      return { number: 90, url: "https://example.com/90" };
    },
  } as unknown as Cards;
  const plan = { title: PLAN.title, text: planText(PLAN) };
  const first = fixSignal(store, "S-0002", () => cards, plan);
  await assert.rejects(
    fixSignal(store, "S-0002", () => cards, plan),
    /A card for signal S-0002 is being made already\./,
  );
  answer();
  const fixed = await first;
  assert.equal(fixed.to, "#90");
  const [card] = made;
  assert.equal(made.length, 1);
  assert.ok(card);
  assert.equal(card.title, "The basket keeps its gloves");
  const agreed = planOf(card.body) ?? "";
  assert.match(agreed, /### Likely cause\nThe basket lives only/);
  assert.match(agreed, /- Show it again on return/);
  assert.match(card.body, /^I put gloves in the basket/);
});

test("the plan is asked for and Fix takes it, through the page's routes", async () => {
  const { claude } = standIn([JSON.stringify(PLAN)]);
  const none = () => Promise.reject(new Error("No app here."));
  const staged = await stage(
    claude,
    {},
    undefined,
    [],
    { apps: () => [], app: none, browser: none },
    true,
  );
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  try {
    const asked = await staged.post("/api/kobble/signals/fix-plan", {
      id: "S-0002",
    });
    assert.deepEqual(await asked.json(), { plan: PLAN });
    const missing = await staged.post("/api/kobble/signals/fix-plan", {
      id: "S-0404",
    });
    assert.deepEqual(await missing.json(), {
      error: "There is no signal “S-0404”.",
    });
  } finally {
    staged.session.close();
    staged.server.close();
  }
});

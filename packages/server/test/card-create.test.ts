import assert from "node:assert/strict";
import { test } from "node:test";

import type { Board } from "@software-factory/core";

import { handOff } from "../src/extensions/explorations/actions.ts";
import { githubCards } from "../src/extensions/github/cards.ts";
import { explorationsFactory } from "./explorations-factory.ts";
import { BOARD, pretendGitHub, type Taking } from "./pretend-github.ts";

// The step every card the factory makes goes through: the issue, added to
// the board, put in its column. A board that adds new issues by itself
// answers "already exists" to the adding: the card is accepted and found
// there, waited for when GitHub is slow, and never made twice.

type Thing = Board["things"][number];

// The choice picked and agreed.
function choiceAgreed(one: Thing): Thing {
  if (one.kind !== "choice") return one;
  return { ...one, agreed: true, chosen: one.options[0]?.key ?? null };
}

// No waiting between looks, so the tests are quick.
const LOOKS = 5;

function board(taking: Taking = {}) {
  const github = pretendGitHub(taking);
  return {
    github,
    cards: githubCards(github.cli, BOARD, { looks: LOOKS, every: 0 }),
  };
}

test("a board that takes issues in by itself: the card is accepted, found and put in To do", async () => {
  const { github, cards } = board({ addsItself: true });
  const card = await cards.create("Totals", "Per month.", "todo");
  assert.equal(card.number, 9);
  assert.equal(github.asked.issues.length, 1);
  assert.equal(github.issues.get(9)?.column, "Ready");
  assert.equal(
    (await cards.list()).find((one) => one.number === 9)?.stage,
    "todo",
  );
});

test("a card GitHub adds late is waited for", async () => {
  const { github, cards } = board({ addsItself: true, showsAfter: 3 });
  const card = await cards.create("Totals", "Per month.", "todo");
  assert.equal(card.number, 9);
  assert.equal(github.issues.get(9)?.column, "Ready");
});

test("a card that never appears: it says so, names the issue, and the issue was told at once", async () => {
  const { github, cards } = board({ addsItself: true, showsAfter: Infinity });
  const told: number[] = [];
  await assert.rejects(
    cards.create("Totals", "Per month.", "todo", (issue) => {
      told.push(issue.number);
    }),
    /Issue #9 was made, but it is not on the board after waiting/,
  );
  assert.deepEqual(told, [9]);
  assert.equal(github.asked.issues.length, 1);
});

test("a board that is asked to add the card still gets it in the column asked for", async () => {
  const { github, cards } = board();
  await cards.create("Totals", "Per month.");
  assert.equal(github.issues.get(9)?.column, "Backlog");
});

test("another answer to the adding is a failure, not an accepted card", async () => {
  const { cards } = board({ addFails: "GitHub is down" });
  await assert.rejects(cards.create("Totals", "Per month."), /GitHub is down/);
});

test("bring adds an issue the board does not have, and leaves one it has", async () => {
  const { github, cards } = board({ addFails: "GitHub is down" });
  await assert.rejects(cards.create("Totals", "Per month."), /GitHub is down/);
  await cards.bring(9);
  assert.ok((await cards.list()).some((one) => one.number === 9));
  const adds = github.asked.adds;
  await cards.bring(9);
  await cards.bring(3);
  assert.equal(github.asked.adds, adds);
});

test("a hand-off that fails between making the issue and adding it carries on with that issue when tried again", async () => {
  const factory = await explorationsFactory();
  try {
    const { github, cards } = board({ addFails: "GitHub is down" });
    const current = factory.store.board("X-1");
    factory.store.saveBoard("X-1", {
      ...current,
      things: current.things.map(choiceAgreed),
    });
    const handed = () => handOff(factory.store, "X-1", () => cards);
    await assert.rejects(handed(), /GitHub is down/);
    assert.equal(factory.store.get("explorations", "X-1")?.issue, 9);
    assert.notEqual(
      factory.store.get("explorations", "X-1")?.status,
      "handed-off",
    );

    const done = await handed();
    assert.equal(done.issue, 9);
    assert.equal(github.asked.issues.length, 1);
    assert.equal(github.issues.get(9)?.column, "Ready");
    assert.equal(factory.store.get("explorations", "X-1")?.work, 9);
    assert.equal(factory.store.get("explorations", "X-1")?.issue, 9);
  } finally {
    factory.close();
  }
});

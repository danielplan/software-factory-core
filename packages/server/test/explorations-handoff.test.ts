import assert from "node:assert/strict";
import { test } from "node:test";

import type { Board } from "@software-factory/core";

import type { Cards } from "../src/cards/cards.ts";
import { handOff } from "../src/kobble/explorations/actions.ts";
import { explorationsFactory } from "./explorations-factory.ts";

// An idea that changes no screen needs no prototype to be handed off.

type Thing = Board["things"][number];

// The board as the team agreed it without a prototype: its choice picked
// and agreed, no prototype agreed.
function agreedWithoutPrototype(one: Thing): Thing {
  if (one.kind === "prototype") return { ...one, agreed: false };
  if (one.kind !== "choice") return one;
  return { ...one, agreed: true, chosen: one.options[0]?.key ?? null };
}

test("an idea that changes no screen is handed off without a prototype, from the board's agreed choices", async () => {
  const factory = await explorationsFactory();
  try {
    const board = factory.store.board("X-1");
    factory.store.saveBoard("X-1", {
      ...board,
      things: board.things.map((one) => agreedWithoutPrototype(one)),
    });
    const made: string[] = [];
    const branches: (string | undefined)[] = [];
    const cards = {
      create: (_title: string, body: string) => {
        made.push(body);
        return Promise.resolve({ number: 52, url: "https://example.com/52" });
      },
    } as unknown as Cards;
    await handOff(
      factory.store,
      "X-1",
      () => cards,
      (input) => {
        branches.push(input.branch);
        return Promise.resolve(null);
      },
    );
    assert.deepEqual(branches, [undefined]);
    assert.match(made[0] ?? "", /\*\*Agreed, without a prototype\*\*/);
    assert.match(made[0] ?? "", /- How does the basket wait until they pay\? /);
    assert.match(made[0] ?? "", /prototype=none/);
    assert.doesNotMatch(made[0] ?? "", /on the branch/);
  } finally {
    factory.close();
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Board, KobbleStore } from "@software-factory/core";

import type { Cards } from "../src/cards/cards.ts";
import { handOff } from "../src/extensions/explorations/actions.ts";
import { applyAct } from "../src/extensions/explorations/board-acts.ts";
import { explorationsFactory } from "./explorations-factory.ts";

// What is handed off: an idea that changes no screen goes without a
// prototype; a board with a prototype hands off that prototype, agreed and
// with its variant, or nothing, so the builder always builds from the
// screen the team worked on.

type Thing = Board["things"][number];

// The choice picked and agreed.
function choiceAgreed(one: Thing): Thing {
  if (one.kind !== "choice") return one;
  return { ...one, agreed: true, chosen: one.options[0]?.key ?? null };
}

function changeBoard(
  store: KobbleStore,
  change: (things: Thing[]) => Thing[],
): void {
  const board = store.board("X-1");
  store.saveBoard("X-1", { ...board, things: change(board.things) });
}

function cardsInto(made: string[]): () => Cards {
  const cards = {
    create: (_title: string, body: string) => {
      made.push(body);
      return Promise.resolve({ number: 52, url: "https://example.com/52" });
    },
  } as unknown as Cards;
  return () => cards;
}

test("an idea that changes no screen is handed off without a prototype, from the board's agreed choices", async () => {
  const factory = await explorationsFactory();
  try {
    changeBoard(factory.store, (things) =>
      things.filter((one) => one.kind !== "prototype").map(choiceAgreed),
    );
    const made: string[] = [];
    const branches: (string | undefined)[] = [];
    await handOff(factory.store, "X-1", cardsInto(made), (input) => {
      branches.push(input.branch);
      return Promise.resolve(null);
    });
    assert.deepEqual(branches, [undefined]);
    assert.match(made[0] ?? "", /\*\*Agreed, without a prototype\*\*/);
    assert.match(made[0] ?? "", /- How does the basket wait until they pay\? /);
    assert.match(made[0] ?? "", /prototype=none/);
    assert.doesNotMatch(made[0] ?? "", /on the branch/);
  } finally {
    factory.close();
  }
});

test("a board with a prototype nobody agreed on is not handed off without it", async () => {
  const factory = await explorationsFactory();
  try {
    changeBoard(factory.store, (things) =>
      things.map((one) =>
        one.kind === "prototype"
          ? { ...one, agreed: false }
          : choiceAgreed(one),
      ),
    );
    const made: string[] = [];
    await assert.rejects(
      handOff(factory.store, "X-1", cardsInto(made)),
      /Agree on the prototype to build first \(A, B\), with its variant/,
    );
    assert.deepEqual(made, []);
    assert.equal(factory.store.get("explorations", "X-1")?.status, "exploring");
  } finally {
    factory.close();
  }
});

test("a prototype nobody agreed on, taken off the board, no longer stands in the way of what the team agreed", async () => {
  const factory = await explorationsFactory();
  try {
    changeBoard(factory.store, (things) =>
      things.map((one) =>
        one.kind === "prototype"
          ? { ...one, agreed: false }
          : choiceAgreed(one),
      ),
    );
    const made: string[] = [];
    // The way out is said in the refusal itself.
    await assert.rejects(
      handOff(factory.store, "X-1", cardsInto(made)),
      /have Doodle take them off the board/,
    );
    let board = factory.store.board("X-1");
    for (const one of board.things)
      if (one.kind === "prototype")
        board = applyAct(board, { act: "remove", id: one.id }, "kobold").board;
    factory.store.saveBoard("X-1", board);
    await handOff(factory.store, "X-1", cardsInto(made));
    assert.match(made[0] ?? "", /\*\*Agreed, without a prototype\*\*/);
    assert.equal(
      factory.store.get("explorations", "X-1")?.status,
      "handed-off",
    );
  } finally {
    factory.close();
  }
});

test("an agreed prototype with variants is handed off only with the variant chosen", async () => {
  const factory = await explorationsFactory();
  try {
    const variants = [
      { key: "A", name: "Email", difference: "a link by email" },
      { key: "B", name: "Account", difference: "kept in the account" },
    ];
    changeBoard(factory.store, (things) =>
      things.map((one) =>
        one.kind === "prototype" && one.agreed
          ? { ...one, variants, variant: undefined }
          : one,
      ),
    );
    const made: string[] = [];
    await assert.rejects(
      handOff(factory.store, "X-1", cardsInto(made)),
      /Say which variant of prototype B is to be built first/,
    );
    assert.deepEqual(made, []);
  } finally {
    factory.close();
  }
});

test("a board whose agreement changes while the spec is written is not handed off", async () => {
  const factory = await explorationsFactory();
  try {
    const made: string[] = [];
    await assert.rejects(
      handOff(factory.store, "X-1", cardsInto(made), () => {
        changeBoard(factory.store, (things) =>
          things.map((one) =>
            one.kind === "prototype"
              ? { ...one, agreed: one.key === "A" }
              : one,
          ),
        );
        return Promise.resolve(null);
      }),
      /changed while the spec was written: hand it off again/,
    );
    assert.deepEqual(made, []);
  } finally {
    factory.close();
  }
});

test("prototypes that were never made do not hold up the hand-off: the board's agreed choices go", async () => {
  const factory = await explorationsFactory();
  try {
    changeBoard(factory.store, (things) =>
      things.map((one) =>
        one.kind === "prototype"
          ? { ...one, agreed: false }
          : choiceAgreed(one),
      ),
    );
    const made: string[] = [];
    await handOff(factory.store, "X-1", cardsInto(made), undefined, {
      unmade: () => ["A", "B"],
    });
    assert.match(made[0] ?? "", /prototype=none/);
  } finally {
    factory.close();
  }
});

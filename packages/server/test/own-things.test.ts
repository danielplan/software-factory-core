import assert from "node:assert/strict";
import { test } from "node:test";

import type { Thing } from "@software-factory/core";

import { applyAct } from "../src/extensions/explorations/board-acts.ts";
import { boardText } from "../src/extensions/explorations/board-things.ts";
import { onTheWeb } from "../src/extensions/explorations/link-preview.ts";
import { ownThings } from "../src/extensions/explorations/own-things.ts";
import type { ExplorationTalks } from "../src/extensions/explorations/talks.ts";
import { explorationsFactory } from "./explorations-factory.ts";

// What a person adds to the board themselves: a note, a link with its
// preview, pen strokes on a card (a new sketch card or any other), taken in
// by the kobold only once it has answered with them, and theirs for good:
// the kobold may move them, never change or remove them.

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PNG = new Uint8Array([137, 80, 78, 71]);

function pretendTalks() {
  const did: { words: string; things: string[] }[] = [];
  const said: string[] = [];
  const talks = {
    personDid: (_id: string, words: string, things: string[] = []) =>
      did.push({ words, things }),
    sayNow: (_id: string, words: string) => said.push(words),
  } as unknown as ExplorationTalks;
  return { talks, did, said };
}

const NOTHING = { title: null, site: null, image: null, icon: null };

async function until(done: () => boolean): Promise<void> {
  for (let tries = 0; tries < 100 && !done(); tries++) await settle();
}

async function settle(): Promise<void> {
  await new Promise((done) => setTimeout(done, 20));
}

test("drawing on empty space opens a sketch card; strokes inside it join it; one on another card stays on it", async () => {
  const factory = await explorationsFactory();
  try {
    const { talks, did } = pretendTalks();
    const on = {
      store: factory.store,
      talks,
      look: () => Promise.resolve(NOTHING),
      onChange: () => undefined,
    };
    const first = ownThings(on, "X-1", {
      do: {
        act: "draw",
        on: null,
        at: { x: 100, y: 50 },
        points: [
          [0, 0],
          [30.123, 10],
        ],
        picture: PIXEL,
      },
    });
    const sketch = factory.store
      .board("X-1")
      .things.find((t) => t.kind === "sketch");
    assert.ok(sketch);
    assert.deepEqual(sketch.place, { x: 100, y: 50 });
    assert.equal(sketch.by, "person");
    assert.ok(sketch.image);
    assert.ok("thing" in first && first.thing.kind === "mark");
    assert.deepEqual(first.thing.points[1], [30.1, 10]);
    // A second stroke on the same card joins it.
    ownThings(on, "X-1", {
      do: {
        act: "draw",
        on: sketch.id,
        points: [[5, 5]],
        picture: PIXEL,
      },
    });
    // One on a card of Doodle's stays on that card, with its picture.
    ownThings(on, "X-1", {
      do: { act: "draw", on: "choice-1", points: [[4, 4]], picture: PIXEL },
    });
    const things = factory.store.board("X-1").things;
    assert.equal(things.filter((t) => t.kind === "sketch").length, 1);
    assert.deepEqual(
      things.flatMap((t) => (t.kind === "mark" ? [t.on] : [])),
      [sketch.id, sketch.id, "choice-1"],
    );
    const onChoice = things.find(
      (t) => t.kind === "mark" && t.on === "choice-1",
    );
    assert.ok(onChoice?.kind === "mark");
    assert.ok(onChoice.image);
    // Doodle hears of them with the next words, each card once.
    assert.equal(did.filter((one) => one.words.includes(sketch.id)).length, 2);
    assert.ok(did.every((one) => one.things.length > 0));
    // A mark goes on a card, not on a mark.
    assert.throws(
      () =>
        ownThings(on, "X-1", {
          do: {
            act: "draw",
            on: onChoice.id,
            points: [[1, 1]],
            picture: PIXEL,
          },
        }),
      /not on another mark/,
    );
    assert.throws(
      () =>
        ownThings(on, "X-1", {
          do: { act: "draw", on: null, points: [[1, 1]], picture: PIXEL },
        }),
      /place it starts at/,
    );
  } finally {
    factory.close();
  }
});

test("taking a stroke off, and taking a card off with its strokes", async () => {
  const factory = await explorationsFactory();
  try {
    const { talks } = pretendTalks();
    const on = {
      store: factory.store,
      talks,
      look: () => Promise.resolve(NOTHING),
      onChange: () => undefined,
    };
    const stroke = (id: string | null) =>
      ownThings(on, "X-1", {
        do: {
          act: "draw",
          on: id,
          at: { x: 0, y: 0 },
          points: [[1, 1]],
          picture: PIXEL,
        },
      });
    stroke(null);
    stroke("sketch-1");
    ownThings(on, "X-1", {
      do: { act: "erase", id: "mark-2", picture: PIXEL },
    });
    const after = factory.store.board("X-1").things;
    assert.deepEqual(
      after.filter((t) => t.kind === "mark").map((t) => t.id),
      ["mark-1"],
    );
    assert.throws(
      () =>
        ownThings(on, "X-1", {
          do: { act: "erase", id: "note-1", picture: null },
        }),
      /Only a mark the team drew/,
    );
    // The card goes, its strokes with it (as a person removes it).
    const gone = applyAct(
      factory.store.board("X-1"),
      {
        act: "remove",
        id: "sketch-1",
      },
      "person",
    );
    assert.ok(!gone.board.things.some((t) => t.kind === "mark"));
  } finally {
    factory.close();
  }
});

test("a note is placed where it was typed and said to Doodle at once", async () => {
  const factory = await explorationsFactory();
  try {
    const { talks, said } = pretendTalks();
    const on = {
      store: factory.store,
      talks,
      look: () => Promise.resolve(NOTHING),
      onChange: () => undefined,
    };
    const added = ownThings(on, "X-1", {
      do: { act: "note", text: " Mia pays at night ", x: 5, y: 6 },
    });
    assert.ok("thing" in added);
    assert.equal(
      added.thing.kind === "note" && added.thing.text,
      "Mia pays at night",
    );
    assert.equal(added.thing.by, "person");
    assert.deepEqual(added.thing.place, { x: 5, y: 6 });
    assert.deepEqual(said, ["I added a note: “Mia pays at night”"]);
    assert.throws(
      () =>
        ownThings(on, "X-1", { do: { act: "note", text: " ", x: 0, y: 0 } }),
      /not something a person adds/,
    );
  } finally {
    factory.close();
  }
});

test("a link is the simple card at once, then gets its page's preview", async () => {
  const factory = await explorationsFactory();
  try {
    const { talks, did } = pretendTalks();
    let changed = 0;
    const on = {
      store: factory.store,
      talks,
      look: () =>
        Promise.resolve({
          title: "A shop made simple",
          site: "Shopkeeper",
          image: { bytes: PNG, kind: "png" as const },
          icon: { bytes: PNG, kind: "png" as const },
        }),
      onChange: () => (changed += 1),
    };
    const added = ownThings(on, "X-1", {
      do: { act: "link", url: "https://www.example.com/shop", x: 1, y: 2 },
    });
    assert.ok("thing" in added);
    const simple = added.thing;
    assert.ok(simple.kind === "link");
    assert.equal(simple.title, "example.com");
    assert.equal(simple.preview, undefined);
    await settle();
    const card = factory.store
      .board("X-1")
      .things.find((t) => t.id === simple.id);
    assert.ok(card?.kind === "link");
    assert.equal(card.title, "A shop made simple");
    assert.equal(card.site, "Shopkeeper");
    assert.ok(card.preview && card.icon);
    assert.ok(factory.store.pictureFile("X-1", card.preview));
    assert.equal(changed, 1);
    // Doodle hears of it once the preview is in.
    assert.deepEqual(did.at(0)?.things, [simple.id]);
  } finally {
    factory.close();
  }
});

test("a link whose page shares nothing, is slow or fails keeps the simple card", async () => {
  const factory = await explorationsFactory();
  try {
    const { talks, did } = pretendTalks();
    const base = { store: factory.store, talks, onChange: () => undefined };
    ownThings({ ...base, look: () => Promise.resolve(NOTHING) }, "X-1", {
      do: { act: "link", url: "https://docs.example.org/", x: 0, y: 0 },
    });
    ownThings(
      { ...base, look: () => Promise.reject(new Error("timed out")) },
      "X-1",
      { do: { act: "link", url: "https://slow.example.org/a", x: 0, y: 0 } },
    );
    await settle();
    const links = factory.store
      .board("X-1")
      .things.flatMap((t) => (t.kind === "link" ? [t] : []));
    assert.deepEqual(
      links.map((l) => [l.title, l.site, l.preview, l.icon]),
      [
        ["docs.example.org", "docs.example.org", undefined, undefined],
        ["slow.example.org", "slow.example.org", undefined, undefined],
      ],
    );
    assert.equal(did.length, 2);
    assert.throws(
      () =>
        ownThings({ ...base, look: () => Promise.resolve(NOTHING) }, "X-1", {
          do: { act: "link", url: "javascript:alert(1)", x: 0, y: 0 },
        }),
      /not something a person adds/,
    );
  } finally {
    factory.close();
  }
});

test("only pages on the open web are read for a preview", () => {
  assert.equal(onTheWeb("https://www.example.com/a?b=1"), true);
  // Plain addresses are the point here: written in parts, they are not
  // taken for ones this code would use.
  const plain = (rest: string) => ["http", rest].join("://");
  assert.equal(onTheWeb(plain("example.org")), true);
  for (const closed of [
    plain("localhost:3000/"),
    plain("127.0.0.1/"),
    plain("192.168.0.4/admin"),
    plain("[::1]/"),
    plain("printer.local/"),
    plain("intranet/"),
    "ftp://example.com/",
    "file:///etc/passwd",
    "not an address",
  ])
    assert.equal(onTheWeb(closed), false, closed);
});

test("the kobold may move what the team put there, never change or remove it", async () => {
  const factory = await explorationsFactory();
  try {
    const { talks } = pretendTalks();
    const on = {
      store: factory.store,
      talks,
      look: () => Promise.resolve(NOTHING),
      onChange: () => undefined,
    };
    ownThings(on, "X-1", { do: { act: "note", text: "Theirs", x: 1, y: 1 } });
    const board = factory.store.board("X-1");
    const mine = board.things.find(
      (t) => t.kind === "note" && t.text === "Theirs",
    );
    assert.ok(mine);
    assert.throws(
      () => applyAct(board, { act: "remove", id: mine.id }, "kobold"),
      /the team's own/,
    );
    assert.throws(
      () =>
        applyAct(board, { act: "change", id: mine.id, text: "Mine" }, "kobold"),
      /the team's own/,
    );
    const moved = applyAct(
      board,
      { act: "move", id: mine.id, x: 300, y: 400 },
      "kobold",
    );
    assert.deepEqual(moved.board.things.find((t) => t.id === mine.id)?.place, {
      x: 300,
      y: 400,
    });
  } finally {
    factory.close();
  }
});

test("Doodle reads the team's things on the board, each card with its picture", async () => {
  const factory = await explorationsFactory();
  try {
    const { talks } = pretendTalks();
    const on = {
      store: factory.store,
      talks,
      look: () => Promise.resolve(NOTHING),
      onChange: () => undefined,
    };
    ownThings(on, "X-1", {
      do: {
        act: "draw",
        on: null,
        at: { x: 0, y: 0 },
        points: [[1, 1]],
        picture: PIXEL,
      },
    });
    ownThings(on, "X-1", {
      do: { act: "draw", on: "choice-1", points: [[1, 1]], picture: PIXEL },
    });
    ownThings(on, "X-1", {
      do: { act: "draw", on: "choice-1", points: [[2, 2]], picture: PIXEL },
    });
    const exploration = factory.store.get("explorations", "X-1");
    assert.ok(exploration);
    const text = boardText(exploration, factory.store.board("X-1"));
    assert.match(
      text,
      /- sketch-1 \(sketch, sketch, the team's own\): a drawing \(read factory\/kobble\/explorations\/X-1\/pictures\/[\w-]+\.png to see it\)/,
    );
    assert.match(text, /2 pen marks on choice-1 \(read factory/);
    // The sketch's strokes are told with the card, not one by one.
    assert.equal(text.match(/\(mark,/g)?.length, 1);
  } finally {
    factory.close();
  }
});

test("a note is heard at once and taken in once Doodle answered; a stroke waits for the next words", async () => {
  const factory = await explorationsFactory([
    { calls: [], reply: "What matters most?" },
    { calls: [], reply: "Thanks, noted." },
    { calls: [], reply: "Looked at your drawing." },
  ]);
  try {
    const taken = (id: string) =>
      factory.store.board("X-3").things.find((t) => t.id === id)?.taken;
    await factory.press("/start", { id: "X-3" });
    await factory.settled("X-3");
    await factory.press("/mine", {
      id: "X-3",
      do: { act: "note", text: "Mia pays at night", x: 0, y: 0 },
    });
    await factory.settled("X-3");
    await until(() => taken("note-1") === true);
    assert.match(
      factory.seen[factory.seen.length - 1]?.prompt ?? "",
      /I added a note: “Mia pays at night”/,
    );
    assert.equal(taken("note-1"), true);
    // A drawing is not taken in by itself.
    const drawn = await factory.press("/mine", {
      id: "X-3",
      do: {
        act: "draw",
        on: null,
        at: { x: 1, y: 1 },
        points: [[1, 1]],
        picture: PIXEL,
      },
    });
    assert.equal(drawn.status, 200);
    await settle();
    assert.notEqual(taken("mark-1"), true);
    assert.notEqual(taken("sketch-1"), true);
    await factory.press("/say", { id: "X-3", text: "What do you think?" });
    await factory.settled("X-3");
    await until(() => taken("mark-1") === true);
    assert.match(
      factory.seen[factory.seen.length - 1]?.prompt ?? "",
      /they drew on sketch sketch-1/,
    );
    assert.equal(taken("mark-1"), true);
    assert.equal(taken("sketch-1"), true);
  } finally {
    factory.close();
  }
});

test("a thing of the team's keeps its kind in the schema's view of the board", async () => {
  const factory = await explorationsFactory();
  try {
    const { talks } = pretendTalks();
    ownThings(
      {
        store: factory.store,
        talks,
        look: () => Promise.resolve(NOTHING),
        onChange: () => undefined,
      },
      "X-1",
      { do: { act: "link", url: "https://example.com/", x: 0, y: 0 } },
    );
    const kinds: Thing["kind"][] = factory.store
      .board("X-1")
      .things.map((t) => t.kind);
    assert.ok(kinds.includes("link"));
  } finally {
    factory.close();
  }
});

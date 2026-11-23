import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addressOf,
  shownOf,
  typedAddress,
} from "../src/extensions/explorations/board/mine/address.ts";
import { cameAs } from "../src/extensions/explorations/board/mine/came.ts";
import {
  ownOf,
  sketchBox,
  targetAt,
  targetsOf,
} from "../src/extensions/explorations/board/mine/own.ts";
import {
  nodesOf,
  onLayer,
  ownedByPerson,
  type Thing,
  type ThingNode,
} from "../src/extensions/explorations/board/nodes.ts";

// The team's own things on the board: where the pen can draw, how a sketch
// card grows around its marks, what a paste or a drop becomes, what is on the
// board's own layer, and what the view does not re-fit for.

const base = { agreed: false, by: "person" as const };
const sketch = (id: string, x: number, y: number): Thing => ({
  ...base,
  id,
  kind: "sketch",
  place: { x, y },
});
const mark = (id: string, on: string, points: [number, number][]): Thing => ({
  ...base,
  id,
  kind: "mark",
  place: null,
  on,
  points,
});

function card(id: string, x: number, y: number, width: number, height: number) {
  return {
    id,
    position: { x, y },
    measured: { width, height },
    data: { thing: { by: "kobold" } },
  } as unknown as ThingNode;
}

test("a sketch card grows around its marks, with some padding", () => {
  const things = [
    sketch("sketch-1", 100, 100),
    mark("mark-1", "sketch-1", [
      [0, 0],
      [200, 90],
    ]),
  ];
  const own = ownOf(things);
  const [first] = own.sketches;
  assert.ok(first);
  assert.deepEqual(sketchBox(first, own.marks, null), {
    x: 80,
    y: 80,
    width: 240,
    height: 130,
  });
  // The stroke being drawn counts too, so the card grows as it is drawn.
  const live = {
    on: "sketch-1",
    points: [
      [100, 100],
      [500, 100],
    ] as const,
  };
  assert.equal(
    sketchBox(first, own.marks, {
      on: live.on,
      points: live.points.map(([x, y]) => [x, y] as const),
    }).width,
    440,
  );
  // With nothing on it, it is a small drawing area.
  const empty = ownOf([sketch("sketch-2", 0, 0)]);
  assert.deepEqual(sketchBox(empty.sketches[0] ?? first, [], null).width, 80);
});

test("a stroke inside a sketch card joins it; one outside starts a new card; one on a card stays on it", () => {
  const own = ownOf([
    sketch("sketch-1", 100, 100),
    mark("mark-1", "sketch-1", [
      [0, 0],
      [200, 90],
    ]),
  ]);
  const targets = targetsOf([card("choice-1", 400, 100, 260, 120)], own, null);
  // Inside the sketch card's box (it begins 20 before its corner).
  assert.equal(targetAt(targets, [90, 90])?.id, "sketch-1");
  assert.equal(targetAt(targets, [250, 150])?.id, "sketch-1");
  // Just outside its edge: no card, so a new sketch card would open.
  assert.equal(targetAt(targets, [79, 150]), undefined);
  assert.equal(targetAt(targets, [321, 150]), undefined);
  // On one of the board's cards.
  assert.equal(targetAt(targets, [500, 150])?.id, "choice-1");
  // A sketch card lies over a card under it.
  const over = targetsOf(
    [card("choice-1", 0, 0, 400, 400)],
    ownOf([sketch("sketch-1", 100, 100)]),
    null,
  );
  assert.equal(targetAt(over, [110, 110])?.id, "sketch-1");
});

test("a paste or drop becomes a picture card or a link card, as fits what was copied", () => {
  const file = (type: string) => ({ type }) as File;
  const brought = (
    files: File[],
    data: Record<string, string> = {},
  ): Parameters<typeof cameAs>[0] => ({
    files,
    getData: (type) => data[type] ?? "",
  });
  const picture = file("image/png");
  assert.deepEqual(cameAs(brought([picture])), { picture });
  assert.deepEqual(cameAs(brought([], { "text/plain": "https://a.org/x" })), {
    link: "https://a.org/x",
  });
  // A link dragged from a browser comes as a list of addresses, with notes.
  assert.deepEqual(
    cameAs(
      brought([], {
        "text/uri-list": "# a note\nhttps://example.com/page\nhttps://b.org",
      }),
    ),
    { link: "https://example.com/page" },
  );
  // A picture copied from a page comes with the page's address: the picture
  // wins.
  assert.deepEqual(
    cameAs(brought([picture], { "text/plain": "https://a.org/" })),
    { picture },
  );
  // Neither: nothing. Words, a file that is not a picture, a file's name.
  assert.equal(cameAs(brought([], { "text/plain": "some words" })), null);
  assert.equal(cameAs(brought([file("application/pdf")])), null);
  assert.equal(cameAs(brought([], { "text/plain": "report.pdf" })), null);
  assert.equal(cameAs(null), null);
});

test("what is typed in the link box may leave out https://; what is pasted may not", () => {
  assert.equal(addressOf("https://example.com/a b"), null);
  assert.equal(addressOf("example.com"), null);
  assert.equal(addressOf("javascript:alert(1)"), null);
  assert.equal(addressOf("http://localhost/"), null);
  assert.equal(
    addressOf(" https://example.com/a?b=1 "),
    "https://example.com/a?b=1",
  );
  assert.equal(typedAddress("example.com/shop"), "https://example.com/shop");
  assert.equal(typedAddress("two words.com"), null);
  assert.equal(typedAddress(""), null);
  assert.equal(
    shownOf("https://www.example.com/shop/a?b=1"),
    "example.com/shop/a?b=1",
  );
  assert.equal(shownOf("https://example.com/"), "example.com");
});

test("the team's own things are on the board's layer, not cards the layout places", () => {
  const link = {
    ...base,
    id: "link-1",
    kind: "link",
    place: { x: 1, y: 2 },
    url: "https://example.com/",
    title: "example.com",
    site: "example.com",
  } as Thing;
  const note = {
    ...base,
    id: "note-1",
    kind: "note",
    place: null,
    text: "Hi",
  } as Thing;
  const doodles = { ...note, id: "note-2", by: "kobold" } as Thing;
  const picture = {
    ...base,
    id: "picture-1",
    kind: "picture",
    place: { x: 0, y: 0 },
    title: "Basket",
    image: "a.png",
  } as Thing;
  assert.deepEqual(
    [
      sketch("s", 0, 0),
      mark("m", "s", [[0, 0]]),
      link,
      note,
      doodles,
      picture,
    ].map(onLayer),
    [true, true, true, true, false, false],
  );
  const page = {
    exploration: { problem: "A problem" },
    board: {
      things: [sketch("s", 0, 0), link, note, doodles, picture],
      links: [],
    },
    talk: { pointed: null },
  } as never;
  const nodes = nodesOf(page, [], { pointed: null, attached: [] });
  // Only Doodle's note and the picture are cards on the board.
  assert.deepEqual(
    nodes.map((n) => n.id),
    ["note-2", "picture-1"],
  );
});

test("the view re-fits for what Doodle adds, not for a picture the person placed", () => {
  const node = (
    by: "kobold" | "person",
    place: { x: number; y: number } | null,
    kind = "picture",
  ) => ({ data: { thing: { by, place, kind } } }) as unknown as ThingNode;
  assert.equal(ownedByPerson(node("person", { x: 1, y: 1 })), true);
  assert.equal(ownedByPerson(node("kobold", { x: 1, y: 1 })), false);
  assert.equal(ownedByPerson(node("person", null)), false);
  assert.equal(ownedByPerson(node("person", { x: 1, y: 1 }, "choice")), false);
});

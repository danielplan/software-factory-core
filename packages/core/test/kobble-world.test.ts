import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  changeWorld,
  checkKobbleIn,
  findProducts,
  KobbleRefused,
  KobbleStore,
  type Product,
  Situations,
  startWorld,
  WorldRefused,
  worldText,
} from "../src/index.ts";
import { situationProblems } from "../src/kobble/situations.ts";
import type { Situation } from "../src/kobble/world.ts";
import { ACME } from "./stand-ins.ts";

// The made-up world an exploration's prototypes share: started from a
// situation, changed on the version seen, kept beside the exploration, and
// the situations' check.

const SITUATION: Situation = {
  name: "An ordinary day",
  about: "One order.",
  clock: "2026-10-13T11:00:00.000Z",
  signed_in: { shop: "c-1" },
  tables: {
    orders: [
      {
        id: "o-1",
        status: "placed",
        placed_at: "2026-10-13T12:00:00.000Z",
        more: { at: "2026-10-13T12:30:00Z" },
      },
    ],
    weeks: [{ starts: "2026-10-12", label: "not a date" }],
    lines: [],
  },
};

const later = new Date("2026-10-20T08:00:00.000Z");

const reasonOf = (why: WorldRefused["why"]) => (error: unknown) =>
  error instanceof WorldRefused && error.why === why;

test("a situation starts now: every time moves by as much, dates by whole days", () => {
  const world = startWorld("ordinary", SITUATION, later);
  assert.equal(world.version, 1);
  assert.equal(world.situation, "ordinary");
  assert.deepEqual(world.signed_in, { shop: "c-1" });
  const order = world.tables.orders?.[0] ?? {};
  // An hour after the clock stays an hour after now.
  assert.equal(order.placed_at, "2026-10-20T09:00:00.000Z");
  assert.deepEqual(order.more, { at: "2026-10-20T09:30:00.000Z" });
  assert.equal(order.status, "placed");
  // 6 days and 21 hours later: 7 whole days.
  assert.deepEqual(world.tables.weeks?.[0], {
    starts: "2026-10-19",
    label: "not a date",
  });
});

test("changes are made on the version seen, all or none", () => {
  const world = startWorld("ordinary", SITUATION, later);
  const next = changeWorld(world, 1, [
    { table: "orders", op: "change", row: { id: "o-1", status: "paid" } },
    { table: "orders", op: "add", row: { id: "o-2", status: "placed" } },
    { table: "lines", op: "add", row: { order: "o-2", qty: 1 } },
    { table: "weeks", op: "remove", row: { starts: "2026-10-19" } },
  ]);
  assert.equal(next.version, 2);
  assert.deepEqual(
    next.tables.orders?.map((one) => [one.id, one.status, "more" in one]),
    [
      ["o-1", "paid", true],
      ["o-2", "placed", false],
    ],
  );
  assert.deepEqual(next.tables.weeks, []);
  assert.equal(next.tables.lines?.length, 1);
  // The kobold changes whatever the version is now.
  assert.equal(
    changeWorld(next, null, [
      { table: "orders", op: "remove", row: { id: "o-2" } },
    ]).tables.orders?.length,
    1,
  );
  assert.throws(
    () => changeWorld(next, 1, []),
    (error) =>
      reasonOf("stale")(error) &&
      /changed meanwhile \(it is at version 2, not 1\)/.test(String(error)),
  );
  const refused: [Parameters<typeof changeWorld>[2][number], RegExp][] = [
    [{ table: "nothing", op: "add", row: {} }, /no table nothing/],
    [{ table: "orders", op: "add", row: { id: "o-1" } }, /id "o-1" already/],
    [{ table: "orders", op: "change", row: { status: "x" } }, /needs its id/],
    [{ table: "orders", op: "remove", row: { id: "o-9" } }, /no row with/],
    [{ table: "weeks", op: "remove", row: { starts: "1999" } }, /like that/],
  ];
  for (const [change, why] of refused)
    assert.throws(
      () => changeWorld(next, 2, [change]),
      (error) => reasonOf("refused")(error) && why.test(String(error)),
    );
});

test("the kobold reads the world in a few lines", () => {
  const world = startWorld("ordinary", SITUATION, later);
  const text = worldText(world, "An ordinary day");
  assert.match(text, /version 1\), started from the situation “An ordinary/);
  assert.match(text, /Signed in: shop: c-1\./);
  assert.match(text, /Tables with rows: orders \(1\), weeks \(1\)\./);
  assert.match(text, /Empty tables: lines\./);
  const bare = worldText({ ...world, signed_in: {}, tables: {} }, "x");
  assert.match(bare, /nobody[\s\S]*rows: none[\s\S]*tables: none/);
});

// The example company, copied: its products with their made-up world.
function acme(): { factory: string; products: () => Product[] } {
  const project = join(mkdtempSync(join(tmpdir(), "world-acme-")), "acme");
  cpSync(join(ACME, ".."), project, { recursive: true });
  const factory = join(project, "factory");
  return { factory, products: () => findProducts(factory).products };
}

test("an exploration's world is kept beside it; one that does not fit is refused", () => {
  const { factory } = acme();
  const store = new KobbleStore(factory);
  assert.equal(store.world("X-1"), null);
  const world = startWorld("ordinary", SITUATION, later);
  assert.deepEqual(store.saveWorld("X-1", world), world);
  assert.deepEqual(store.world("X-1"), world);
  assert.throws(() => store.saveWorld("X-99", world), KobbleRefused);
  writeFileSync(join(store.root, "explorations", "X-1", "world.json"), "{}");
  assert.throws(
    () => store.world("X-1"),
    /explorations\/X-1\/world.json does not fit/,
  );
  assert.match(
    checkKobbleIn(factory).problems.join("\n"),
    /world.json does not fit/,
  );
});

test("the products' situations are offered together, in the order of their keys", () => {
  const { products } = acme();
  const situations = new Situations(products);
  assert.deepEqual(
    situations.names().map((one) => [one.key, one.product]),
    [
      ["everyday", "orders"],
      ["first-visit", "orders"],
      ["monthly-buyers", "orders"],
    ],
  );
  assert.equal(situations.first(), "everyday");
  assert.equal(situations.get("first-visit").signed_in.shop, "guest-1");
  assert.throws(
    () => situations.get("nowhere"),
    (error) =>
      reasonOf("refused")(error) &&
      /The situations: everyday/.test(String(error)),
  );
  const none = new Situations(() => []);
  assert.equal(none.first(), null);
  assert.throws(() => none.get("everyday"), reasonOf("missing"));
});

test("the check: situations that fit, keep the same tables, one key once; personas name one there is", () => {
  const { factory, products } = acme();
  assert.deepEqual(checkKobbleIn(factory).problems, []);
  const [orders] = products();
  assert.ok(orders);
  const folder = join(orders.folder, "prototype-world");
  writeFileSync(join(folder, "broken.json"), "{");
  writeFileSync(join(folder, "bare.json"), JSON.stringify({ name: "Bare" }));
  writeFileSync(
    join(folder, "fewer.json"),
    JSON.stringify({ ...SITUATION, tables: { orders: [] } }),
  );
  const shop: Product = {
    ...orders,
    id: "shop",
    world: "elsewhere",
    folder: join(orders.folder, ".."),
  };
  mkdirSync(join(shop.folder, "elsewhere"));
  writeFileSync(
    join(shop.folder, "elsewhere", "everyday.json"),
    JSON.stringify(SITUATION),
  );
  const gone: Product = { ...orders, id: "gone", world: "not-there" };
  const problems = situationProblems([...products(), shop, gone]);
  const expected = [
    /^gone: its world folder not-there is not there/,
    /^orders: The situation bare does not fit/,
    /^orders: The situation broken cannot be read/,
    /^shop: the situation everyday is offered by another product too/,
    /^orders: the situation fewer has the tables orders, but everyday has basket_lines, customers, orders, products/,
  ];
  assert.equal(problems.length, expected.length, problems.join("\n"));
  for (const pattern of expected)
    assert.ok(
      problems.some((one) => pattern.test(one)),
      `${pattern.source} in ${problems.join("\n")}`,
    );
  // A persona naming a situation there is not.
  const store = new KobbleStore(factory);
  const mia = store.get("personas", "mia");
  assert.ok(mia);
  store.put("personas", { ...mia, situation: "holidays" });
  assert.ok(
    checkKobbleIn(factory).problems.includes(
      "kobble/personas/mia.json: there is no situation “holidays”.",
    ),
  );
});

test("without Kobble's files, the situations are still checked", () => {
  const { factory } = acme();
  rmSync(new KobbleStore(factory).root, { recursive: true });
  assert.deepEqual(checkKobbleIn(factory), { checked: true, problems: [] });
  const empty = join(mkdtempSync(join(tmpdir(), "world-none-")), "factory");
  mkdirSync(empty);
  assert.deepEqual(checkKobbleIn(empty), { checked: false, problems: [] });
});

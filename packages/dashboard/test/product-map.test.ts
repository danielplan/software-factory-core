import assert from "node:assert/strict";
import { test } from "node:test";

import type { PartView, ProductPage } from "../src/api.ts";
import { leftWhenWide } from "../src/product/fit.ts";
import { chipsOf, mapOf, PROJECT, type Product } from "../src/product/map.ts";

// The Product page's map: the project, then each product after the ones
// it needs, joined by arrows that move while what they lead to runs.

const product = (id: string, stack: Product["stack"] = []): Product =>
  ({
    id,
    name: id,
    kind: `${id}-kind`,
    kit: `${id}-kit`,
    stack,
  }) as Product;
const part = (
  id: string,
  dependsOn: string[] = [],
  light: PartView["light"] = "stopped",
): PartView => ({ id, dependsOn, light }) as PartView;
const page = (products: Product[]): ProductPage => ({
  project: { name: "acme", folder: "/acme", branch: "main", remote: null },
  products,
});

test("the project first, then each product after the ones it needs", () => {
  const { nodes, edges } = mapOf(
    page([product("shop"), product("orders"), product("mail")]),
    [
      part("shop", ["orders"], "running"),
      part("orders"),
      part("mail", ["shop"]),
    ],
    (one) => `Kind of ${one.id}`,
  );
  assert.deepEqual(
    nodes.map((node) => [node.id, node.position.x]),
    [
      [PROJECT, 0],
      ["orders", 320],
      ["shop", 640],
      ["mail", 960],
    ],
  );
  assert.deepEqual(
    edges.map((edge) => [edge.source, edge.target, edge.animated]),
    [
      ["orders", "shop", true],
      [PROJECT, "orders", false],
      ["shop", "mail", false],
    ],
  );
  const shop = nodes.find((node) => node.id === "shop");
  assert.equal(shop?.type === "product" && shop.data.kind, "Kind of shop");
});

test("products in one column are stacked around the middle; a loop or an unknown part counts as nothing needed", () => {
  const { nodes, edges } = mapOf(
    page([product("a"), product("b"), product("c")]),
    [part("a", ["b"]), part("b", ["a"]), part("c", ["elsewhere", "c"])],
    (one) => one.kind,
  );
  const at = (id: string) => nodes.find((node) => node.id === id)?.position;
  assert.deepEqual(at("c"), { x: 320, y: 0 });
  assert.equal(at("a")?.x, 640);
  assert.equal(at("b")?.x, 640);
  assert.deepEqual([at("a")?.y, at("b")?.y], [-90, 90]);
  assert.ok(
    edges.some((edge) => edge.source === PROJECT && edge.target === "c"),
  );
  const lonely = mapOf(page([product("x")]), [], (one) => one.kind);
  assert.deepEqual(
    lonely.edges.map((edge) => [edge.source, edge.target]),
    [[PROJECT, "x"]],
  );
});

test("a product shows the most telling of its stack, and how many more", () => {
  assert.deepEqual(
    chipsOf([
      { group: "Language", items: ["TypeScript"] },
      { group: "Tools", items: ["Vite"] },
      { group: "Data", items: ["Prisma", "Redis"] },
      { group: "Interface", items: ["React"] },
      { group: "Something new", items: ["Thing"] },
    ]),
    { chips: ["React", "Prisma", "Redis"], more: 3 },
  );
  assert.deepEqual(chipsOf([]), { chips: [], more: 0 });
});

test("a map that fits stays centred; a wider one starts at its left edge", () => {
  const centred = { x: 100, y: 40, zoom: 0.85 };
  // 400 wide at 0.85 is 340: it fits in 800.
  assert.deepEqual(
    leftWhenWide(centred, { x: 0, y: 0, width: 400, height: 100 }, 800),
    centred,
  );
  // 1200 wide at 0.85 is 1020: wider than 800, so the first card is at the
  // left edge, 24px in, and the height stays as React Flow put it.
  assert.deepEqual(
    leftWhenWide(
      { x: -110, y: 40, zoom: 0.85 },
      { x: 20, y: 0, width: 1200, height: 100 },
      800,
    ),
    { x: 24 - 20 * 0.85, y: 40, zoom: 0.85 },
  );
});

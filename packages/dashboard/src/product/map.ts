// The Product page's map, worked out from what the server sends: the
// project on the left, then each product in the column after the products
// it needs, joined by arrows (the project to each product that needs no
// other, a product to each product that needs it). An arrow moves while
// the product it leads to runs. Kept apart from the components so it is
// checked on its own.

import type { Edge, Node } from "@xyflow/react";

import type { PartView, ProductPage } from "../api.ts";

type Page = ProductPage;
export type Product = Page["products"][number];

export const PROJECT = "project";

export type ProjectNode = Node<{ project: Page["project"] }, "project">;
export type ProductNode = Node<
  {
    product: Product;
    part: PartView | null;
    kind: string;
    chips: string[];
    more: number;
  },
  "product"
>;
export type MapNode = ProjectNode | ProductNode;

// How far apart the columns and the products in a column are.
const COLUMN = 320;
const ROW = 180;

// The groups that say most about a product, first.
const TELLING = [
  "Interface",
  "Server",
  "Data",
  "Language",
  "Look",
  "Checks",
  "Tools",
];

// A product's stack in a few chips, the most telling first, and how many
// more there are.
export function chipsOf(
  stack: Product["stack"],
  shown = 3,
): { chips: string[]; more: number } {
  const rank = (group: string) => {
    const at = TELLING.indexOf(group);
    return at === -1 ? TELLING.length : at;
  };
  const all = stack
    .toSorted((a, b) => rank(a.group) - rank(b.group))
    .flatMap((group) => group.items);
  return { chips: all.slice(0, shown), more: Math.max(0, all.length - shown) };
}

export function mapOf(
  page: Page,
  parts: PartView[],
  kindOf: (product: Product) => string,
): { nodes: MapNode[]; edges: Edge[] } {
  const partOf = (id: string) => parts.find((part) => part.id === id) ?? null;
  const ids = new Set(page.products.map((product) => product.id));
  const needs = (product: Product) =>
    (partOf(product.id)?.dependsOn ?? []).filter(
      (id) => ids.has(id) && id !== product.id,
    );
  const columns = columnsOf(page.products, needs);
  const nodes: MapNode[] = [
    {
      id: PROJECT,
      type: "project",
      position: { x: 0, y: 0 },
      data: { project: page.project },
    },
    ...columns.flatMap((column, at) =>
      column.map((product, row): ProductNode => ({
        id: product.id,
        type: "product",
        position: {
          x: (at + 1) * COLUMN,
          y: (row - (column.length - 1) / 2) * ROW,
        },
        data: {
          product,
          part: partOf(product.id),
          kind: kindOf(product),
          ...chipsOf(product.stack),
        },
      })),
    ),
  ];
  const arrow = (source: string, target: string): Edge => ({
    id: `${source}->${target}`,
    source,
    target,
    animated: partOf(target)?.light === "running",
  });
  const edges = page.products.flatMap((product) => {
    const needed = needs(product);
    return needed.length === 0
      ? [arrow(PROJECT, product.id)]
      : needed.map((id) => arrow(id, product.id));
  });
  return { nodes, edges };
}

// The products in columns: each one column after the deepest product it
// needs (a loop counts as nothing needed).
function columnsOf(
  products: Product[],
  needs: (product: Product) => string[],
): Product[][] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const depthOf = (product: Product, seen: Set<string>): number => {
    const below = needs(product)
      .filter((id) => !seen.has(id))
      .map((id) => byId.get(id))
      .filter((other): other is Product => other !== undefined)
      .map((other) => depthOf(other, new Set([...seen, other.id])));
    return below.length === 0 ? 0 : 1 + Math.max(...below);
  };
  const columns: Product[][] = [];
  for (const product of products) {
    const at = depthOf(product, new Set([product.id]));
    columns[at] = [...(columns[at] ?? []), product];
  }
  return columns.filter(Boolean);
}

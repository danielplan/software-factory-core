// software-factory rules [product]: the rules of a product's kit (its
// conventions, with the libraries table, and its lessons), printed whole, so
// an agent reads the ones of the core pinned in the project, wherever it is
// installed. Without a product, each product's kit and the command for it.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { findFactory, findProducts, type Kit } from "@software-factory/core";

type Out = (line: string) => void;

export function rulesHere(
  from: string,
  wanted: string | undefined,
  kits: Kit[],
  out: Out,
): number {
  const root = findFactory(resolve(from));
  if (!root) {
    out("There is no factory here: run it in a project.");
    return 1;
  }
  const { products } = findProducts(root);
  if (wanted === undefined) {
    for (const product of products)
      out(
        `${product.id}: ${product.kind} (npx software-factory rules ${product.id})`,
      );
    return 0;
  }
  const product = products.find((one) => one.id === wanted);
  if (!product) {
    const known = products.map((one) => one.id).join(", ");
    out(`There is no product “${wanted}”. The products: ${known || "none"}.`);
    return 1;
  }
  const kit = kits.find((one) => one.kind === product.kind);
  if (!kit || kit.rules.length === 0) {
    out(
      `${product.id} is ${product.kind}: its kit has no rules of its own; the factory's AGENTS.md and the company's conventions hold.`,
    );
    return 0;
  }
  out(kit.rules.map((file) => readFileSync(file, "utf8")).join("\n\n"));
  return 0;
}

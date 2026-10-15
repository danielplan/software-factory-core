// Finds a company's products: every folder, matched by the company file's
// patterns, that has a product.json. The factory knows a product only from
// there, never by its name in code.

import { globSync } from "node:fs";
import { basename, join } from "node:path";

import { type Product, readProduct } from "./product.ts";

export const PRODUCT_FILE = "product.json";

// The products found under the root, and what is wrong with the ones that
// could not be read (or have an id another product has).
export function findProducts(
  root: string,
  patterns: string[],
): { products: Product[]; problems: string[] } {
  const files = new Set(
    patterns.flatMap((pattern) =>
      globSync(join(pattern, PRODUCT_FILE), {
        cwd: root,
        exclude: (path) => basename(path) === "node_modules",
      }),
    ),
  );
  const products: Product[] = [];
  const problems: string[] = [];
  for (const file of [...files].sort((a, b) => a.localeCompare(b))) {
    const read = readProduct(join(root, file));
    if ("problem" in read) problems.push(read.problem);
    else if (products.some((p) => p.id === read.product.id))
      problems.push(`${file}: the id "${read.product.id}" is taken`);
    else products.push(read.product);
  }
  return { products, problems };
}

// Finds a company's products: each folder in the factory folder's products/
// with a product.json. The factory knows a product only from there, never by
// its name in code.

import { globSync } from "node:fs";
import { join } from "node:path";

import { type Product, readProduct } from "./product.ts";

export const PRODUCT_FILE = "product.json";
export const PRODUCTS_FOLDER = "products";

// The products described under the root, and what is wrong with the ones
// that could not be read (or whose id is not their folder's name).
export function findProducts(root: string): {
  products: Product[];
  problems: string[];
} {
  const files = globSync(join(PRODUCTS_FOLDER, "*", PRODUCT_FILE), {
    cwd: root,
  }).sort((a, b) => a.localeCompare(b));
  const products: Product[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const read = readProduct(join(root, file));
    const folder = file.split(/[\\/]/)[1];
    if ("problem" in read) problems.push(read.problem);
    else if (read.product.id !== folder)
      problems.push(
        `${file}: its id is "${read.product.id}", but its folder is "${folder ?? ""}"`,
      );
    else products.push(read.product);
  }
  return { products, problems };
}

// Loads a company's factory from its repository: the company file, its
// products, and the extensions and kits it uses, put together.

import { join } from "node:path";

import { COMPANY_FILE, readCompany } from "./company/company.ts";
import {
  assembleFactory,
  type Available,
  type Factory,
} from "./extensions/registry.ts";
import type { Part } from "./parts/part.ts";
import { findProducts } from "./products/find-products.ts";
import type { Product } from "./products/product.ts";

// A working copy of the project (copies/workspace.ts): its folder, a folder
// for its own data outside its code (never committed with it), and how far
// its products' ports are moved from the owner's, so both run at once.
export type InCopy = { folder: string; data: string; shift: number };

// The factory, with every problem found; it cannot be loaded at all
// without a readable company file. In a working copy, each product's port
// is moved by the copy's shift and its copy settings (copyEnv) are added.
export function loadFactory(
  root: string,
  available: Available,
  copy?: InCopy,
): Factory | { problem: string } {
  const read = readCompany(join(root, COMPANY_FILE));
  if ("problem" in read) return read;
  const found = findProducts(root);
  const products = copy
    ? found.products.map((product) => movedPort(product, available, copy))
    : found.products;
  const factory = assembleFactory(read.company, products, available);
  const parts = copy
    ? factory.parts.map((part) => withCopyEnv(part, products, copy))
    : factory.parts;
  return {
    ...factory,
    parts,
    problems: [...found.problems, ...factory.problems],
  };
}

function movedPort(product: Product, available: Available, copy: InCopy) {
  const port =
    product.port ??
    available.kits.find((kit) => kit.kind === product.kind)?.port;
  return port ? { ...product, port: port + copy.shift } : product;
}

function withCopyEnv(part: Part, products: Product[], copy: InCopy): Part {
  const env = products.find((product) => product.id === part.id)?.copyEnv;
  if (!env || Object.keys(env).length === 0) return part;
  const filled = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      key,
      value.replaceAll("{copy}", copy.folder).replaceAll("{data}", copy.data),
    ]),
  );
  return { ...part, env: { ...part.env, ...filled } };
}

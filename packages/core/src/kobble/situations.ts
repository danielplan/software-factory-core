// Where the made-up world's situations are: each product may name a folder
// of them as its "world" in product.json (from its code's folder), one file
// <key>.json per situation, written as the product's own tables. The
// situations of every product are offered together, in the order of their
// keys; and their check (software-factory check): each file fits, no key
// is offered twice, and the situations of one product keep the same tables
// (a new table goes into every situation).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { z } from "zod";

import { messageOf, type Product } from "../products/product.ts";
import { type Situation, situationSchema, WorldRefused } from "./world.ts";

// A situation offered, without its tables.
export type SituationName = {
  key: string;
  name: string;
  about: string;
  // The product whose world it is.
  product: string;
};

type Found = { key: string; product: Product; file: string };

// The folder of a product's situations, when it names one.
export function worldFolder(product: Product): string | null {
  return product.world ? resolve(product.folder, product.world) : null;
}

function found(products: Product[]): Found[] {
  return products
    .flatMap((product) => {
      const folder = worldFolder(product);
      if (!folder || !existsSync(folder)) return [];
      return readdirSync(folder)
        .filter((name) => name.endsWith(".json"))
        .map((name) => ({
          key: basename(name, ".json"),
          product,
          file: join(folder, name),
        }));
    })
    .sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }));
}

function read(one: Found): Situation {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(one.file, "utf8"));
  } catch (error) {
    throw new WorldRefused(
      `The situation ${one.key} cannot be read: ${messageOf(error)}`,
    );
  }
  const parsed = situationSchema.safeParse(data);
  if (!parsed.success)
    throw new WorldRefused(
      `The situation ${one.key} does not fit: ${z.prettifyError(parsed.error)}`,
    );
  return parsed.data;
}

export class Situations {
  private readonly products: () => Product[];

  constructor(products: () => Product[]) {
    this.products = products;
  }

  // The situations offered; one that does not fit is left out (the check
  // says why).
  names(): SituationName[] {
    return found(this.products()).flatMap((one) => {
      try {
        const { name, about } = read(one);
        return [{ key: one.key, name, about, product: one.product.id }];
      } catch {
        return [];
      }
    });
  }

  // A situation by its key; refused with the ones there are.
  get(key: string): Situation {
    const all = found(this.products());
    const one = all.find((each) => each.key === key);
    if (!one)
      throw new WorldRefused(
        all.length === 0
          ? "No product has a made-up world yet: a product names its folder of situations as its “world” in product.json."
          : `There is no situation ${key}. The situations: ${all.map((each) => each.key).join(", ")}.`,
        all.length === 0 ? "missing" : "refused",
      );
    return read(one);
  }

  // Where a world starts when nothing says: the first situation.
  first(): string | null {
    return found(this.products())[0]?.key ?? null;
  }
}

// What is wrong with the products' situations, each starting with where.
export function situationProblems(products: Product[]): string[] {
  const problems: string[] = [];
  const all = found(products);
  for (const product of products) {
    const folder = worldFolder(product);
    if (folder && !existsSync(folder))
      problems.push(
        `${product.id}: its world folder ${product.world ?? ""} is not there.`,
      );
  }
  const tablesOf = new Map<string, { key: string; tables: string }>();
  const keys = new Set<string>();
  for (const one of all) {
    if (keys.has(one.key))
      problems.push(
        `${one.product.id}: the situation ${one.key} is offered by another product too.`,
      );
    keys.add(one.key);
    let situation: Situation;
    try {
      situation = read(one);
    } catch (error) {
      problems.push(`${one.product.id}: ${messageOf(error)}`);
      continue;
    }
    const tables = Object.keys(situation.tables)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");
    const before = tablesOf.get(one.product.id);
    if (before && before.tables !== tables)
      problems.push(
        `${one.product.id}: the situation ${one.key} has the tables ${tables}, but ${before.key} has ${before.tables}.`,
      );
    tablesOf.set(one.product.id, before ?? { key: one.key, tables });
  }
  return problems;
}

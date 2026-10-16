// Makes the new products of a factory being set up (greenfield): each with
// its kit's starter commands, one product after the other, in the folder its
// code goes in. Each is a job the page shows while it works.

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { Kit } from "@software-factory/core";

import type { Job, SetupProduct } from "./api.ts";
import { runJobs, runSteps } from "./jobs.ts";

// True when every product was made.
export async function createProducts(
  products: SetupProduct[],
  kits: Kit[],
  show: (jobs: Job[]) => void,
): Promise<boolean> {
  return runJobs(
    products.map((product) => ({
      id: product.id,
      label: `Making ${product.name}`,
      run: (log) => createOne(product, kits, log),
    })),
    show,
  );
}

async function createOne(
  product: SetupProduct,
  kits: Kit[],
  log: (line: string) => void,
): Promise<boolean> {
  const kit = kits.find((k) => k.kind === product.kind);
  const steps = kit?.create?.(product.folder, product.name);
  if (!steps) {
    log(`No kit can make a ${product.kind}.`);
    return false;
  }
  if (existsSync(product.folder)) {
    log(`${product.folder} is there already: it is used as it is.`);
    return true;
  }
  const parent = dirname(product.folder);
  mkdirSync(parent, { recursive: true });
  return (await runSteps(steps, parent, log)) && existsSync(product.folder);
}

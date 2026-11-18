// Makes the new products of a factory being set up (greenfield): each as a
// copy of its kit's starter, when the kit has one, finished by the kit's
// commands (or made by them alone, with the framework's own generator), one
// product after the other, in the folder its code goes in. Each is a job the
// page shows while it works.

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { copyStarter, type Kit } from "@software-factory/core";
import type { Launcher } from "@software-factory/launcher";

import type { Job, SetupProduct } from "./api.ts";
import { runJobs, runSteps } from "./jobs.ts";

// True when every product was made.
async function createProducts(
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

// The new products made, then every product added that runs started (a
// kit may make no part for one), once all were made.
export async function makeAndStart(
  products: SetupProduct[],
  kits: Kit[],
  on: { show: (jobs: Job[]) => void; launcher: () => Launcher | null },
): Promise<void> {
  const made = await createProducts(
    products.filter((p) => p.isNew),
    kits,
    on.show,
  );
  const launcher = on.launcher();
  if (!made || !launcher) return;
  const parts = new Set(launcher.state().map((part) => part.id));
  const starting = products.filter((p) => parts.has(p.id));
  await Promise.allSettled(starting.map((p) => launcher.start(p.id)));
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
  if (kit?.starter && !copied(kit.starter, kit.name, product, log))
    return false;
  return (await runSteps(steps, parent, log)) && existsSync(product.folder);
}

// The kit's starter copied into the product's folder, as the product; a
// starter that cannot be copied fails the job with what went wrong.
function copied(
  starter: string,
  kitName: string,
  product: SetupProduct,
  log: (line: string) => void,
): boolean {
  try {
    const named = copyStarter(starter, product.folder, product.name);
    log(`Copied the ${kitName} starter as ${named}.`);
    return true;
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
    return false;
  }
}

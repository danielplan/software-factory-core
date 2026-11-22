// Adds the products of a factory being set up. A new product (greenfield) is
// made first, in the folder its code goes in: a copy of its kit's starter,
// when the kit has one, finished by the kit's commands (or made by them
// alone, with the framework's own generator). Only then is it described
// next to its code (product.json, its first blueprint), with the commands
// its kit finds in the code made and what its starter brings (its settings
// file, its made-up world, a database per working copy), and in the shape
// the product's own Prettier writes, so its checks pass from the start. Each new product is a
// job the page shows while it works; existing code is described as it is.
//
// The order matters: describing first would make the product's folder, and
// a folder that is there already is used as it is, so the starter would
// never be copied.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { copyStarter, type Kit } from "@software-factory/core";
import type { Launcher } from "@software-factory/launcher";

import type { Job, SetupProduct } from "./api.ts";
import { runJobs, runSteps } from "./jobs.ts";
import { describeProduct, useKits } from "./write-factory.ts";

export type Adding = {
  show: (jobs: Job[]) => void;
  // The product's description written next to its code; the files written.
  describe: (product: SetupProduct) => string[];
  // Every product was described: the factory reads its files again.
  described: () => void;
  launcher: () => Launcher | null;
};

type Log = (line: string) => void;

// The folder of situations a starter brings as a product's made-up world.
const WORLD_FOLDER = "prototype-world";

// The products the coach adds to the factory at root: the kits they need
// first (refused as a whole when one does not fit), then each made and
// described; the names of the new ones that could not be made.
export async function addProducts(
  root: string,
  products: SetupProduct[],
  kits: Kit[],
  on: Pick<Adding, "show" | "launcher"> & { reread: () => void },
): Promise<string[]> {
  useKits(root, products, kits);
  on.reread();
  return makeAndStart(products, kits, {
    ...on,
    describe: (product) => describeProduct(root, product),
    described: on.reread,
  });
}

// The products described, the new ones made first; then every product
// added that runs is started (a kit may make no part for one), once all
// were made. The names of the new products that could not be made.
export async function makeAndStart(
  products: SetupProduct[],
  kits: Kit[],
  on: Adding,
): Promise<string[]> {
  for (const product of products.filter((p) => !p.isNew))
    await described(product, kitOf(product, kits), on.describe, () => {});
  const failed: string[] = [];
  await runJobs(
    products
      .filter((p) => p.isNew)
      .map((product) => ({
        id: product.id,
        label: `Making ${product.name}`,
        run: async (log: Log) => {
          const made = await makeOne(product, kits, on.describe, log);
          if (!made) failed.push(product.name);
          return made;
        },
      })),
    on.show,
  );
  on.described();
  const launcher = on.launcher();
  if (failed.length > 0 || !launcher) return failed;
  const parts = new Set(launcher.state().map((part) => part.id));
  const starting = products.filter((p) => parts.has(p.id));
  await Promise.allSettled(starting.map((p) => launcher.start(p.id)));
  return failed;
}

function kitOf(product: SetupProduct, kits: Kit[]): Kit | undefined {
  return kits.find((k) => k.kind === product.kind);
}

// The product made, then described once its code is there, also when
// finishing it did not work (its packages are installed again when it
// starts); true when it was made.
async function makeOne(
  product: SetupProduct,
  kits: Kit[],
  describe: Adding["describe"],
  log: Log,
): Promise<boolean> {
  const kit = kitOf(product, kits);
  const steps = kit?.create?.(product.folder, product.name);
  if (!kit || !steps) {
    log(`No kit can make a ${product.kind}.`);
    return false;
  }
  const fresh = !existsSync(product.folder);
  const made = fresh
    ? await fromKit(kit, steps, product, log)
    : usedAsItIs(product, log);
  if (!existsSync(product.folder)) return false;
  try {
    const taken = fresh ? withStarterSettings(product) : product;
    await described(taken, kit, describe, log);
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
    return false;
  }
  return made;
}

function usedAsItIs(product: SetupProduct, log: Log): boolean {
  log(`${product.folder} is there already: it is used as it is.`);
  return true;
}

async function fromKit(
  kit: Kit,
  steps: string[][],
  product: SetupProduct,
  log: Log,
): Promise<boolean> {
  const parent = dirname(product.folder);
  mkdirSync(parent, { recursive: true });
  if (kit.starter && !copied(kit.starter, kit.name, product, log)) return false;
  settingsFromExample(product.folder, log);
  return (await runSteps(steps, parent, log)) && existsSync(product.folder);
}

// The settings file of a product made from a starter that lists its
// settings in .env.example: a copy of it, so the product starts as it is.
function settingsFromExample(folder: string, log: Log): void {
  const example = join(folder, ".env.example");
  const settings = join(folder, ".env");
  if (!existsSync(example) || existsSync(settings)) return;
  copyFileSync(example, settings);
  log("Made its .env from .env.example.");
}

// What a product made from its kit's starter takes from what the starter
// brings: its made-up world (a prototype-world/ folder), and a database of
// its own in each working copy when its settings name DATABASE_NAME (named
// after the product and the copy's own port).
function withStarterSettings(product: SetupProduct): SetupProduct {
  const { folder, id } = product;
  const world = existsSync(join(folder, WORLD_FOLDER)) ? WORLD_FOLDER : null;
  const example = join(folder, ".env.example");
  const database =
    existsSync(example) &&
    /^DATABASE_NAME=/m.test(readFileSync(example, "utf8"));
  return {
    ...product,
    ...(world && !product.world ? { world } : {}),
    ...(database
      ? { copyEnv: { DATABASE_NAME: `${id}-{port:${id}}`, ...product.copyEnv } }
      : {}),
  };
}

// The kit's starter copied into the product's folder, as the product; a
// starter that cannot be copied fails the job with what went wrong.
function copied(
  starter: string,
  kitName: string,
  product: SetupProduct,
  log: Log,
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

// The product described with the commands its kit finds in its code (its
// check, how it starts), the ones it was given winning, then the files
// written put in its own Prettier's shape.
async function described(
  product: SetupProduct,
  kit: Kit | undefined,
  describe: Adding["describe"],
  log: Log,
): Promise<void> {
  const found = kit?.detect(product.folder)?.commands ?? {};
  const written = describe({
    ...product,
    commands: { ...found, ...product.commands },
  });
  await formatted(product.folder, written, log);
}

// The files formatted with the product's own Prettier and its settings, when
// it has Prettier installed: its format check then passes on what the
// factory wrote. A product without it is left as it is.
async function formatted(folder: string, files: string[], log: Log) {
  if (!existsSync(join(folder, "node_modules", "prettier"))) return;
  const command = ["npx", "--no-install", "prettier", "--write"];
  await runSteps([[...command, "--ignore-unknown", ...files]], folder, log);
}

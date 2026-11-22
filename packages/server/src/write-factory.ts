// The project's factory folder from the dashboard's setup steps: the
// company first (the folder, the project's rules pointing to it, and the
// project's own checks), then products whenever the owner adds them: the
// kits their kinds need first, then each product's description once its
// code is there (found in existing code, or just made).

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  addProduct,
  createFactoryFolder,
  FACTORY_FOLDER,
  findProducts,
  hasFactory,
  type Kit,
  pointToFactory,
  PRODUCT_FILE,
  readCompany,
  saveCompany,
  type Templates,
} from "@software-factory/core";

import type { CreateCompany, SetupProduct } from "./api.ts";
import { installSkills } from "./install-skills.ts";
import { pinCore } from "./pin-core.ts";
import { addProjectChecks } from "./project-checks.ts";
import { addKitServers } from "./kit-servers.ts";
import { Refused } from "./refused.ts";

// The factory folder made in the project; its path.
export function writeCompany(
  request: CreateCompany,
  project: string,
  templates: Templates,
): string {
  const name = request.name.trim();
  if (!name) throw new Refused("Give the project a name.");
  const root = join(project, FACTORY_FOLDER);
  if (hasFactory(root))
    throw new Refused(`There is a factory in ${root} already.`);
  createFactoryFolder(root, { name, about: request.about }, templates);
  pointToFactory(project);
  installSkills(project);
  addProjectChecks(project, name);
  pinCore(project);
  return root;
}

// The kits the products' kinds need, added to the company file with their
// MCP servers, before any product is made. Refused as a whole when one
// product does not fit, so nothing is made for a list that cannot be added.
export function useKits(
  root: string,
  products: SetupProduct[],
  kits: Kit[],
): void {
  if (products.length === 0) throw new Refused("Choose a product to add.");
  const taken = new Set(findProducts(root).products.map((p) => p.id));
  const kinds = new Set(products.map((p) => p.kind));
  for (const product of products)
    if (taken.has(product.id))
      throw new Refused(`There is a product "${product.id}" already.`);
  for (const kind of kinds)
    if (!kits.some((kit) => kit.kind === kind))
      throw new Refused(`No kit knows a ${kind}.`);
  const read = readCompany(join(root, "factory.json"));
  if ("problem" in read) throw new Refused(read.problem);
  const used = new Set([
    ...read.company.kits,
    ...kits.filter((kit) => kinds.has(kit.kind)).map((kit) => kit.id),
  ]);
  saveCompany(root, { ...read.company, kits: [...used] });
  // The kits' MCP servers, for the agents working on these products.
  addKitServers(
    dirname(root),
    kits.filter((kit) => kinds.has(kit.kind)),
  );
}

// The product's description next to its code, once the code is there
// (product.json, and its first blueprint unless it has one), listed in the
// company file; the files it wrote.
export function describeProduct(root: string, product: SetupProduct): string[] {
  const hadBlueprint = existsSync(join(product.folder, "BLUEPRINT.md"));
  addProduct(
    root,
    {
      id: product.id,
      name: product.name,
      kind: product.kind,
      folder: product.folder,
      about: product.about,
      users: product.users ?? [],
      commands: product.commands ?? {},
      dependsOn: product.dependsOn ?? [],
      ...(product.port ? { port: product.port } : {}),
      ...(product.world ? { world: product.world } : {}),
      ...(product.copyEnv ? { copyEnv: product.copyEnv } : {}),
    },
    product.blueprint,
  );
  return hadBlueprint ? [PRODUCT_FILE] : [PRODUCT_FILE, "BLUEPRINT.md"];
}

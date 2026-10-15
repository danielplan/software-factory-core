// The company's factory folder from the dashboard's setup steps: the
// company first, then products (found in existing code, or about to be
// made) whenever the owner adds them, with the kits their kinds need.

import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  addProduct,
  createFactoryFolder,
  findProducts,
  idFrom,
  type Kit,
  readCompany,
  saveCompany,
  type Templates,
} from "@software-factory/core";

import type { CreateCompany, SetupProduct } from "./api.ts";
import { Refused } from "./refused.ts";

type Place = { factoriesFolder: string; kits: Kit[]; templates: Templates };

export function writeCompany(request: CreateCompany, place: Place): string {
  const name = request.name.trim();
  if (!name) throw new Refused("Give the company a name.");
  const root =
    request.folder?.trim() || join(place.factoriesFolder, idFrom(name));
  if (existsSync(join(root, "factory.json")))
    throw new Refused(`There is a factory in ${root} already.`);
  createFactoryFolder(root, { name, about: request.about }, place.templates);
  return root;
}

// The products' descriptions, and the kits their kinds need added to the
// company file. Refused as a whole when one does not fit.
export function writeProducts(
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
  for (const product of products)
    addProduct(root, {
      id: product.id,
      name: product.name,
      kind: product.kind,
      folder: product.folder,
      about: product.about,
      users: [],
      commands: product.commands ?? {},
      dependsOn: [],
      ...(product.port ? { port: product.port } : {}),
    });
}

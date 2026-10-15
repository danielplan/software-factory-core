// The new factory folder from the setup page's answers: the company, and a
// description of each product (found in existing code, or about to be made),
// with the kits their kinds need.

import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  addProduct,
  createFactoryFolder,
  idFrom,
  type Kit,
  saveCompany,
  type Templates,
} from "@software-factory/core";

import type { FinishSetup } from "./api.ts";
import { Refused } from "./refused.ts";

export function writeFactory(
  request: FinishSetup,
  place: { factoriesFolder: string; kits: Kit[]; templates: Templates },
): string {
  const name = request.company.name.trim();
  if (!name) throw new Refused("Give the company a name.");
  if (request.products.length === 0)
    throw new Refused("Add at least one product.");
  const root =
    request.folder?.trim() || join(place.factoriesFolder, idFrom(name));
  if (existsSync(join(root, "factory.json")))
    throw new Refused(`There is a factory in ${root} already.`);
  const kinds = new Set(request.products.map((p) => p.kind));
  const kits = place.kits.filter((kit) => kinds.has(kit.kind));
  for (const kind of kinds)
    if (!kits.some((kit) => kit.kind === kind))
      throw new Refused(`No kit knows a ${kind}.`);
  const company = createFactoryFolder(
    root,
    { ...request.company, name },
    place.templates,
  );
  saveCompany(root, { ...company, kits: kits.map((kit) => kit.id) });
  for (const product of request.products)
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
  return root;
}

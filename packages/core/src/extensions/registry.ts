// Puts a company's factory together: its products, the extensions and kits
// it uses, and what they add (parts, settings, the agents' guides), with
// everything that does not fit said in plain words before anything starts.

import type { Company } from "../company/company.ts";
import { checkParts, inStartOrder, type Part } from "../parts/part.ts";
import type { Product } from "../products/product.ts";
import { checkGroups, type SettingGroup } from "../settings/setting-groups.ts";
import type { Extension, Guide, Kit } from "./extension.ts";

// What the core knows about: every extension and kit installed.
export type Available = { extensions: Extension[]; kits: Kit[] };

// A product with its kit's usual commands filled in where it says nothing.
export type KnownProduct = Product & { kit: string };

export type Factory = {
  company: Company;
  products: KnownProduct[];
  extensions: Extension[];
  kits: Kit[];
  parts: Part[];
  settings: SettingGroup[];
  guides: Guide[];
  problems: string[];
};

export function assembleFactory(
  company: Company,
  products: Product[],
  available: Available,
): Factory {
  const problems: string[] = [];
  const extensions = chosenExtensions(company, available, problems);
  const kits = chosenKits(company, available, problems);
  const known = products.flatMap((product) => {
    const kit = kits.find((k) => k.kind === product.kind);
    if (kit) return [withKit(product, kit)];
    problems.push(
      `"${product.id}" is a ${product.kind}, but the company uses no kit for that kind`,
    );
    return [];
  });
  problems.push(...dependencyProblems(known));
  // Products are found in folder order: their parts go after what they need.
  const parts = inStartOrder([
    ...known.flatMap((product) => partsOf(product, kits)),
    ...extensions.flatMap((extension) => extension.parts),
  ]);
  const settings = extensions.flatMap((extension) => extension.settings);
  problems.push(
    ...checkParts(parts),
    ...checkGroups(
      settings,
      parts.map((part) => part.id),
    ),
  );
  const guides = [
    ...extensions.flatMap((extension) => extension.guides),
    ...kits.flatMap((kit) => kit.guides),
  ];
  return {
    company,
    products: known,
    extensions,
    kits,
    parts,
    settings,
    guides,
    problems,
  };
}

// The core extensions, unless the company switched one off, then the
// add-ons it named.
function chosenExtensions(
  company: Company,
  available: Available,
  problems: string[],
): Extension[] {
  const named = (id: string) => available.extensions.some((e) => e.id === id);
  for (const id of [...company.extensions, ...company.without])
    if (!named(id)) problems.push(`there is no extension "${id}"`);
  return available.extensions.filter((extension) =>
    extension.core
      ? !company.without.includes(extension.id)
      : company.extensions.includes(extension.id),
  );
}

function chosenKits(
  company: Company,
  available: Available,
  problems: string[],
): Kit[] {
  return company.kits.flatMap((id) => {
    const kit = available.kits.find((k) => k.id === id);
    if (kit) return [kit];
    problems.push(`there is no kit "${id}"`);
    return [];
  });
}

function withKit(product: Product, kit: Kit): KnownProduct {
  return {
    ...product,
    kit: kit.id,
    commands: { ...kit.commands, ...product.commands },
  };
}

function partsOf(product: KnownProduct, kits: Kit[]): Part[] {
  return kits.find((kit) => kit.id === product.kit)?.partsFor(product) ?? [];
}

function dependencyProblems(products: KnownProduct[]): string[] {
  const ids = new Set(products.map((product) => product.id));
  return products.flatMap((product) =>
    product.dependsOn
      .filter((id) => !ids.has(id))
      .map(
        (id) =>
          `"${product.id}" needs "${id}", which is not one of the products`,
      ),
  );
}

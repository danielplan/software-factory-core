// What each release of the core changes in a company's factory folder, as
// code: `software-factory upgrade` runs the migrations of every release
// after the factory's version, in order. A change a company would otherwise
// have to make by hand comes with one here; what a migration cannot decide
// alone, it leaves to the owner, said in a line.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  type Company,
  COMPANY_FILE,
  type Extension,
  findProducts,
  type Kit,
  readCompany,
  saveCompany,
} from "@software-factory/core";

import { trackedWith } from "../add-ons/switch.ts";
import { Refused } from "../refused.ts";

export type UpgradeContext = {
  // The project, and its factory folder in it.
  project: string;
  root: string;
  kits: Kit[];
  extensions: Extension[];
};

// What a migration did, and what it leaves to the owner.
export type Migrated = { done: string[]; left: string[] };

export type Migration = {
  version: string;
  about: string;
  run: (context: UpgradeContext) => Migrated;
};

export const MIGRATIONS: Migration[] = [
  {
    version: "0.2.0",
    about: "Products of a kind a kit now knows get that kit",
    run: kindsKitsNowKnow,
  },
  {
    version: "0.2.0",
    about: "Only the tracker in use is on",
    run: ({ root, extensions }) => {
      const company = companyOf(root);
      const tracked = trackedWith(company, extensions, company.tracker);
      if (sameList(tracked.without, company.without)) return nothing();
      saveCompany(root, tracked);
      return { done: ["Switched off the trackers not in use."], left: [] };
    },
  },
  {
    version: "0.2.0",
    about: "The agents' ground rules name the board's cards",
    run: ({ root }) =>
      addAfter(
        join(root, "AGENTS.md"),
        "`update-context`.",
        "software-factory card",
        " When the factory is connected to a board, work comes from its cards: `software-factory card` lists, plans and readies them (`software-factory card help`).",
      ),
  },
];

// A product described as other code that a kit now recognises becomes that
// kit's kind; the company's kits follow its products.
function kindsKitsNowKnow({ root, kits }: UpgradeContext): Migrated {
  const done: string[] = [];
  const left: string[] = [];
  const specific = kits.filter((kit) => !kit.fallback);
  for (const product of findProducts(root).products) {
    if (product.kind !== "other-code") continue;
    const kit = specific.find((one) => one.detect(product.folder) !== null);
    if (!kit) continue;
    const file = join(root, "products", product.id, "product.json");
    const data = JSON.parse(readFileSync(file, "utf8")) as Record<
      string,
      unknown
    >;
    writeFileSync(
      file,
      `${JSON.stringify({ ...data, kind: kit.kind }, null, 2)}\n`,
    );
    done.push(`${product.name} is now a ${kit.name} (it was other code).`);
    const blueprint = join(root, "products", product.id, "BLUEPRINT.md");
    if (!replaceKind(blueprint, kit.kind))
      left.push(
        `Say in products/${product.id}/BLUEPRINT.md that its kind is ${kit.kind}.`,
      );
  }
  if (done.length > 0) keepKitsOfProducts(root, kits);
  return { done, left };
}

// The company's kits: one for each kind its products have.
function keepKitsOfProducts(root: string, kits: Kit[]): void {
  const kinds = new Set(findProducts(root).products.map((p) => p.kind));
  const company = companyOf(root);
  saveCompany(root, {
    ...company,
    kits: kits.filter((kit) => kinds.has(kit.kind)).map((kit) => kit.id),
  });
}

function replaceKind(file: string, kind: string): boolean {
  if (!existsSync(file)) return false;
  const text = readFileSync(file, "utf8");
  const changed = text.replace(
    /^(- \*\*Kind:\*\* )other-code\b[^.\n]*/m,
    `$1${kind}`,
  );
  if (changed === text) return false;
  writeFileSync(file, changed);
  return true;
}

// Adds text after a sentence of a file, once.
function addAfter(
  file: string,
  after: string,
  mark: string,
  text: string,
): Migrated {
  if (!existsSync(file)) return nothing();
  const read = readFileSync(file, "utf8");
  if (read.includes(mark)) return nothing();
  if (!read.includes(after))
    return {
      done: [],
      left: [`Add to factory/AGENTS.md:${text}`],
    };
  writeFileSync(file, read.replace(after, after + text));
  return { done: ["Named the board's cards in factory/AGENTS.md."], left: [] };
}

export function companyOf(root: string): Company {
  const read = readCompany(join(root, COMPANY_FILE));
  if ("problem" in read) throw new Refused(read.problem);
  return read.company;
}

function sameList(a: string[], b: string[]): boolean {
  const sorted = (list: string[]) =>
    [...list].sort((x, y) => x.localeCompare(y)).join();
  return sorted(a) === sorted(b);
}

function nothing(): Migrated {
  return { done: [], left: [] };
}

// Reads what the kits need from a folder's package.json: its name, the
// packages it uses and the scripts it has. A folder without one, or with one
// that cannot be read, is no product of any kit.

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

import type { Product } from "@software-factory/core";

export type PackageJson = {
  name: string | null;
  packages: Set<string>;
  scripts: Set<string>;
};

export function readPackageJson(folder: string): PackageJson | null {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const file = data as Record<string, unknown>;
  return {
    name: typeof file.name === "string" ? file.name : null,
    packages: new Set([
      ...keysOf(file.dependencies),
      ...keysOf(file.devDependencies),
    ]),
    scripts: new Set(keysOf(file.scripts)),
  };
}

function keysOf(value: unknown): string[] {
  return typeof value === "object" && value !== null ? Object.keys(value) : [];
}

// "my-shop", "@acme/my_shop" → "My shop"; the folder's name when there is none.
export function readableName(file: PackageJson, folder: string): string {
  const raw = (file.name ?? basename(folder)).replace(/^@[^/]+\//, "");
  const words = raw.replace(/[-_.]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "App";
}

// The command that checks the product: the first of its verify, check or
// test scripts.
export function verifyCommand(file: PackageJson): string | undefined {
  const script = ["verify", "check", "test"].find((name) =>
    file.scripts.has(name),
  );
  if (script === undefined) return undefined;
  return script === "test" ? "npm test" : `npm run ${script}`;
}

// The commands found, without the ones that are not there.
export function commandsOf(
  entries: Record<string, string | undefined>,
): Product["commands"] {
  return Object.fromEntries(
    Object.entries(entries).filter(([, value]) => value !== undefined),
  );
}

// What the part says it does: the product's own words, or a plain line.
export function doesOf(product: Product, what: string): string {
  return product.about || `The ${product.name} ${what}.`;
}

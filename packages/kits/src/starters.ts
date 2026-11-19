// The kits' own starters (in packages/kits/starters/<kit>): a whole empty
// product per kind, with the kit's standards, checks and prototype mode. A
// new product of a kit with a starter is a copy of it, then its packages
// are installed.

import { basename, join } from "node:path";

export function starterFolder(kit: string): string {
  return join(import.meta.dirname, "..", "starters", kit);
}

// Run in the product folder's parent, after the starter was copied in.
export function installIn(folder: string): string[][] {
  return [["npm", "install", "--prefix", basename(folder)]];
}

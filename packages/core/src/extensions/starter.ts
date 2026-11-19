// A kit's starter: a whole empty product of the kit's kind, with its
// standards, checks and prototype mode, kept in the kit's own folder. A new
// product starts as a copy of it. The copy leaves out what a starter never
// ships (installed packages, builds), names `_gitignore` back to
// `.gitignore` (a package cannot carry a .gitignore of its own), and gives
// the copy the product's name: the starter's package name, wherever it is
// written (package.json, its lock file, storage keys, messages), becomes the
// product's.

import {
  cpSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

import { idFrom } from "../setup/detect.ts";

// Never copied: what installing, building or testing a starter leaves.
const LEFT_OUT = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".expo",
  ".DS_Store",
]);

// The package name the starter carries ("new-web-app"); refused when the
// starter has none, as a broken kit should show at once.
export function starterName(starter: string): string {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(starter, "package.json"), "utf8"));
  } catch {
    throw new Error(`The starter in ${starter} has no package.json.`);
  }
  const name = (data as { name?: unknown }).name;
  if (typeof name !== "string" || name === "")
    throw new Error(`The starter in ${starter} has no package name.`);
  return name;
}

// Copies the starter into `folder` (which does not exist yet) as the
// product called `name`, and says the package name it was given ("My
// shop" → "my-shop").
export function copyStarter(
  starter: string,
  folder: string,
  name: string,
): string {
  const from = starterName(starter);
  const to = idFrom(name);
  cpSync(starter, folder, {
    recursive: true,
    filter: (path) => !LEFT_OUT.has(basename(path)),
  });
  for (const file of filesIn(folder)) {
    const text = readFileSync(file);
    // A file with a zero byte is not text (an icon, a font): kept as it is.
    if (!text.includes(0) && text.includes(from))
      writeFileSync(file, text.toString("utf8").replaceAll(from, to));
    if (basename(file) === "_gitignore")
      renameSync(file, join(file, "..", ".gitignore"));
  }
  return to;
}

function filesIn(folder: string): string[] {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

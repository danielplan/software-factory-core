// What the kobold knows about the product before its first answer, made
// fresh for each exploration: the products, what each is for and who uses
// it, and the pages the factory keeps in docs/ (the kobold reads the one
// that matches). For the prototype maker, a map of a product's code: its
// screens and its shared pieces, so it opens only the files it needs.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { findProducts, type Product } from "@software-factory/core";

const MOST_PAGES = 40;
const MOST_FILES = 60;
const SKIPPED = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".svelte-kit",
  "coverage",
]);
// Files that are screens, in the usual frameworks' words.
const SCREEN =
  /(^|\/)(routes|pages|app|screens|views)\/.*\.(tsx|jsx|svelte|vue|ts)$/;
// Folders of shared pieces.
const SHARED = /(^|\/)(components|ui|lib)\//;

export function productPicture(root: string, project: string): string {
  const { products } = findProducts(root);
  const lines = ["## The product"];
  for (const product of products) {
    lines.push(
      `- **${product.name}** (${relative(project, product.folder) || "."}): ${product.about || "no description yet"}`,
    );
    for (const user of product.users)
      lines.push(`  - ${user.who}: ${user.does}`);
  }
  if (products.length === 0) lines.push("- No product is described yet.");
  const pages = docsPages(project);
  if (pages.length > 0)
    lines.push(
      "",
      "## The pages the factory keeps",
      ...pages.map((p) => `- ${p}`),
    );
  return lines.join("\n");
}

// docs/ pages, with their first heading.
function docsPages(project: string): string[] {
  const docs = join(project, "docs");
  if (!existsSync(docs)) return [];
  return filesIn(docs)
    .filter((file) => file.endsWith(".md"))
    .slice(0, MOST_PAGES)
    .map((file) => {
      const heading = readFileSync(join(docs, file), "utf8")
        .split("\n")
        .find((line) => line.startsWith("# "));
      const path = `docs/${file}`;
      return heading ? `${path}: ${heading.slice(2).trim()}` : path;
    });
}

// The product's screens and shared pieces, as paths in the product's folder.
export function codeMap(product: Pick<Product, "name" | "folder">): string {
  if (!existsSync(product.folder)) return "";
  const files = filesIn(product.folder);
  const screens = files
    .filter((file) => SCREEN.test(file))
    .slice(0, MOST_FILES);
  const shared = files
    .filter((file) => SHARED.test(file) && !SCREEN.test(file))
    .slice(0, MOST_FILES);
  if (screens.length === 0 && shared.length === 0) return "";
  return [
    `## A map of ${product.name}`,
    ...(screens.length > 0
      ? ["Screens:", ...screens.map((f) => `- ${f}`)]
      : []),
    ...(shared.length > 0
      ? ["Shared pieces:", ...shared.map((f) => `- ${f}`)]
      : []),
  ].join("\n");
}

// Every product's map, for the prototype maker's prompt.
export function codeMaps(root: string): string {
  return findProducts(root).products.map(codeMap).filter(Boolean).join("\n\n");
}

// Every file under a folder, as paths in it, never inside installed
// packages, builds or git's own folder.
function filesIn(folder: string, inside = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(folder, inside), {
    withFileTypes: true,
  })) {
    if (SKIPPED.has(entry.name)) continue;
    const path = inside ? `${inside}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...filesIn(folder, path));
    else if (entry.isFile()) found.push(path);
  }
  return found.sort((a, b) => a.localeCompare(b));
}

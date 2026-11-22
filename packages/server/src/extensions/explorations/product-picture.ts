// What the kobold knows about the product before its first answer, made
// fresh for each exploration: the products, what each is for and who uses
// it, and the pages the factory keeps in docs/ (the kobold reads the one
// that matches). For the prototype maker, a map of a product's code: its
// screens and its shared pieces, so it opens only the files it needs.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { findProducts, type Product } from "@software-factory/core";

const MOST_PAGES = 40;
const MOST_FILES = 250;
const MOST_WORDS = 100;
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
// Code, not tests, styles or pictures.
const CODE = /\.(tsx|jsx|ts|js|svelte|vue)$/;
const TESTS = /(^|\/)(tests?|__tests__)\/|\.(test|spec)\./;

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

// The product's code files, each with what its first comment says it is
// for, so the maker opens only the files it needs. Screens first, in the
// usual frameworks' words, then the rest by folder.
export function codeMap(product: Pick<Product, "name" | "folder">): string {
  if (!existsSync(product.folder)) return "";
  const files = filesIn(product.folder).filter(
    (file) => CODE.test(file) && !TESTS.test(file),
  );
  if (files.length === 0) return "";
  const screens = files.filter((file) => SCREEN.test(file));
  const rest = files.filter((file) => !SCREEN.test(file));
  const line = (file: string) => {
    const about = firstComment(join(product.folder, file));
    return about ? `- ${file}: ${about}` : `- ${file}`;
  };
  const listed = [...screens, ...rest].slice(0, MOST_FILES);
  return [
    `## A map of ${product.name}`,
    "Its code files, with what each says it is for:",
    ...listed.map(line),
    ...(files.length > listed.length
      ? [`- and ${String(files.length - listed.length)} more`]
      : []),
  ].join("\n");
}

// The first line of a file's opening comment, shortened.
function firstComment(path: string): string {
  const head = readFileSync(path, "utf8").slice(0, 600).split("\n");
  const first = head.find((text) => /^\s*(\/\/|\/\*|\*|#)/.test(text));
  if (!first) return "";
  const words = first.replace(/^\s*(\/\/+|\/\*+|\*+|#+)\s*/, "").trim();
  return words.length > MOST_WORDS ? `${words.slice(0, MOST_WORDS)}…` : words;
}

// Every product's map, for the prototype maker's prompt; with the project,
// the pages the factory keeps first, so the maker reads how the product
// looks (its design system) and what matters for the change before it
// builds.
export function codeMaps(root: string, project?: string): string {
  const pages = project ? docsPages(project) : [];
  const docs =
    pages.length > 0
      ? [
          "## The pages the factory keeps",
          "Read the one on how the product looks (its design system, its look, its pieces) and those about what you change, before you build:",
          ...pages.map((p) => `- ${p}`),
        ].join("\n")
      : "";
  const maps = findProducts(root).products.map(codeMap).filter(Boolean);
  return [docs, ...maps].filter(Boolean).join("\n\n");
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

// 0.6.0: what a factory knows and its products' descriptions move out of the
// factory folder, into the project. Its knowledge base (factory/context/)
// joins the project's docs/, as one space; each product's description
// (factory/products/<id>/: product.json, BLUEPRINT.md) goes next to its
// code, and the company file lists the products' folders. Every Markdown link
// and written path that pointed at the old places is set to the new ones. A
// page that is already in docs/ with other text is left where it was, for the
// owner to merge.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  COMPANY_FILE,
  companySchema,
  DOCS_FOLDER,
  PRODUCT_FILE,
  PRODUCTS_FOLDER,
  saveCompany,
} from "@software-factory/core";

import type { Migrated, UpgradeContext } from "./migrations.ts";

// Folders never looked into when the links are set.
const SKIPPED = new Set([
  "node_modules",
  ".git",
  "copies",
  "settings",
  ".release",
]);

type Moves = { files: Map<string, string>; folders: [string, string][] };

export function moveOut({ project, root }: UpgradeContext): Migrated {
  const left: string[] = [];
  const moves: Moves = { files: new Map(), folders: [] };
  const knowledge = join(root, "context");
  const hadKnowledge = existsSync(knowledge);
  if (hadKnowledge) {
    planFolder(knowledge, join(project, DOCS_FOLDER), moves, left, project);
    moves.folders.push([knowledge, join(project, DOCS_FOLDER)]);
  }
  const listed = planProducts(root, project, moves, left);
  if (!hadKnowledge && listed === null) return { done: [], left };
  applyMoves(project, moves);
  removeEmpty(join(root, PRODUCTS_FOLDER));
  const done: string[] = [];
  if (hadKnowledge)
    done.push(
      "Moved the knowledge base from factory/context/ into docs/, beside the project's own docs, and set the links.",
    );
  if (listed) {
    saveCompany(root, { ...companyAt(root), products: listed });
    done.push(
      "Moved each product's description (product.json, BLUEPRINT.md) next to its code, listed the products in factory.json, and set the links.",
    );
  }
  return { done, left };
}

// The links first, while every page is still where it was; then the files
// move, the pages get their new text, and emptied folders go.
function applyMoves(project: string, moves: Moves): void {
  const rewritten = new Map<string, string>();
  for (const page of markdownUnder(project)) {
    const text = readFileSync(page, "utf8");
    const now = moves.files.get(page) ?? page;
    const changed = withMovedLinks(text, page, now, moves, project);
    if (changed !== text || now !== page) rewritten.set(page, changed);
  }
  for (const [from, to] of moves.files) {
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  }
  for (const [page, text] of rewritten)
    writeFileSync(moves.files.get(page) ?? page, text);
  for (const [from] of moves.folders) removeEmpty(from);
}

// Every file of a folder, to go to the same place under `to`; one whose
// place is taken by other text stays, for the owner.
function planFolder(
  from: string,
  to: string,
  moves: Moves,
  left: string[],
  project: string,
): void {
  for (const file of filesUnder(from)) {
    const target = join(to, relative(from, file));
    if (existsSync(target) && !sameText(file, target)) {
      left.push(
        `${relative(project, file)} stays where it is: ${relative(project, target)} has other text. Merge them by hand.`,
      );
      continue;
    }
    if (existsSync(target)) rmSync(file);
    else moves.files.set(file, target);
  }
}

// The products described in the factory folder go next to their code; their
// folders, as the company file lists them (null when there is nothing to do).
function planProducts(
  root: string,
  project: string,
  moves: Moves,
  left: string[],
): string[] | null {
  const company = companyAt(root);
  const inside = join(root, PRODUCTS_FOLDER);
  if (company.products || !existsSync(inside)) return null;
  const listed: string[] = [];
  for (const id of readdirSync(inside).sort((x, y) => x.localeCompare(y))) {
    const home = join(inside, id);
    const file = join(home, PRODUCT_FILE);
    if (!existsSync(file)) continue;
    const data = JSON.parse(readFileSync(file, "utf8")) as { code?: string };
    const code = resolve(home, data.code ?? ".");
    if (!existsSync(code)) {
      left.push(
        `${relative(project, home)} stays where it is: its code (${data.code ?? ""}) is not there. Say where it is, then move it by hand.`,
      );
      continue;
    }
    delete data.code;
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    planFolder(home, code, moves, left, project);
    moves.folders.push([home, code]);
    const named = relative(project, code);
    listed.push(
      named.startsWith(`..${sep}`) || isAbsolute(named) ? code : named || ".",
    );
  }
  return listed;
}

// The page's text with its links and written paths set to where things are
// now: links relative to the page (from where it is now), written paths
// that named the old places from the project's root.
export function withMovedLinks(
  text: string,
  page: string,
  now: string,
  moves: Moves,
  project: string,
): string {
  const linked = text.replace(
    /(\]\()([^)\s#]+)((?:#[^)\s]*)?\))/g,
    (whole, open: string, target: string, close: string) => {
      if (/^[a-z]+:/i.test(target) || target.startsWith("/")) return whole;
      const was = resolve(dirname(page), target);
      const is = movedTo(was, moves);
      if (is === was && now === page) return whole;
      const path = relative(dirname(now), is).split(sep).join("/") || ".";
      const slash = target.endsWith("/") && !path.endsWith("/") ? "/" : "";
      return `${open}${path}${slash}${close}`;
    },
  );
  return moves.folders.reduce((said, [from, to]) => {
    const old = `${relative(project, from).split(sep).join("/")}/`;
    const fresh = relative(project, to).split(sep).join("/");
    return said.replaceAll(old, fresh ? `${fresh}/` : "");
  }, linked);
}

// Where a file or folder is after the moves.
function movedTo(path: string, moves: Moves): string {
  const file = moves.files.get(path);
  if (file) return file;
  for (const [from, to] of moves.folders)
    if (path === from || path.startsWith(from + sep))
      return join(to, relative(from, path));
  return path;
}

function filesUnder(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function markdownUnder(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) return [];
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return markdownUnder(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

function sameText(a: string, b: string): boolean {
  return readFileSync(a, "utf8") === readFileSync(b, "utf8");
}

// A folder emptied by the moves goes; one with something left stays.
function removeEmpty(folder: string): void {
  if (!existsSync(folder)) return;
  for (const entry of readdirSync(folder, { withFileTypes: true }))
    if (entry.isDirectory()) removeEmpty(join(folder, entry.name));
  if (readdirSync(folder).length === 0) rmSync(folder, { recursive: true });
}

function companyAt(root: string) {
  return companySchema.parse(
    JSON.parse(readFileSync(join(root, COMPANY_FILE), "utf8")),
  );
}

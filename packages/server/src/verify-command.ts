// software-factory verify [file…]: each product's verify command (its
// product.json's, or its kit's usual one), run in its folder; with files,
// only the products they are in; with --pushed, the products a push
// changes.
// software-factory check-format [file…]: the format check of each product a
// file is in (its own `npm run format:check`, when it has one). They are the
// project's own checks: `npm run verify` at the top of a project and its git
// hooks run them (project-checks.ts). Each product's output is shown as it
// runs; the command fails when one check failed.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import {
  findFactory,
  findProducts,
  type Kit,
  type Product,
} from "@software-factory/core";
import { GIT } from "@software-factory/knowledge-base";

type Out = (line: string) => void;
// Runs a command line in a folder, its output shown; true when it passed.
export type Shell = (command: string, cwd: string) => boolean;

// Git tells a hook which repository it runs for (GIT_DIR and friends); a
// product's check that makes its own scratch repository would inherit them
// and change this one instead, so the checks start without them.
const GIT_HOOK_VARIABLES = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_PREFIX",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
];

const realShell: Shell = (command, cwd) => {
  const env = { ...process.env };
  for (const name of GIT_HOOK_VARIABLES) Reflect.deleteProperty(env, name);
  return (
    spawnSync(command, { cwd, env, shell: true, stdio: "inherit" }).status === 0
  );
};

export function verifyHere(
  from: string,
  files: string[],
  kits: Kit[],
  out: Out,
  shell: Shell = realShell,
): number {
  return checkEach(from, files, out, shell, (product) => {
    const kit = kits.find((one) => one.kind === product.kind);
    const command = product.commands.verify ?? kit?.commands.verify;
    if (!command)
      out(
        `${product.id}: no verify command in its product.json, so nothing checks it.`,
      );
    return command;
  });
}

// software-factory verify --pushed, as the git hook before a push runs it:
// the products the pushed commits change, from what git gives the hook (a
// line per branch: <local ref> <local sha> <remote ref> <remote sha>). The
// commits are the ones no remote has yet, so a new branch counts only its
// own. Nothing pushed, or no product changed: nothing to check.
export function verifyPushed(
  from: string,
  input: string,
  kits: Kit[],
  out: Out,
  shell: Shell = realShell,
): number {
  const files = pushedFiles(from, input);
  if (files.length === 0) return 0;
  return verifyHere(from, files, kits, out, shell);
}

function pushedFiles(from: string, input: string): string[] {
  const shas = input
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 4 && !/^0+$/.test(parts[1] ?? ""))
    .map((parts) => parts[1] ?? "");
  const files = shas.flatMap((sha) =>
    execFileSync(
      GIT,
      ["log", "--name-only", "--format=", sha, "--not", "--remotes"],
      { cwd: from, encoding: "utf8" },
    ).split("\n"),
  );
  return [...new Set(files.filter((file) => file.trim() !== ""))];
}

export function checkFormatHere(
  from: string,
  files: string[],
  out: Out,
  shell: Shell = realShell,
): number {
  return checkEach(from, files, out, shell, (product) =>
    scriptsOf(product.folder).includes("format:check")
      ? "npm run format:check"
      : undefined,
  );
}

// Runs the command each product (each one a file is in, when files are
// given) has for the check, in its folder; fails when any failed.
function checkEach(
  from: string,
  files: string[],
  out: Out,
  shell: Shell,
  commandOf: (product: Product) => string | undefined,
): number {
  const root = findFactory(resolve(from));
  if (!root) {
    out("There is no factory here: run it in a project.");
    return 1;
  }
  const paths = files.map((file) => resolve(from, file));
  const failed = findProducts(root)
    .products.filter((p) => files.length === 0 || holdsAny(p.folder, paths))
    .flatMap((product) => {
      const command = commandOf(product);
      if (!command) return [];
      out(`▶ ${product.id}: ${command}`);
      return shell(command, product.folder) ? [] : [{ product, command }];
    });
  if (failed.length === 0) return 0;
  out("\nThese checks failed:");
  for (const { product, command } of failed)
    out(
      `  ✗ ${product.id}: ${command} (in ${relative(from, product.folder) || "."})`,
    );
  out("Fix them and try again. Never skip the checks with --no-verify.");
  return 1;
}

function holdsAny(folder: string, paths: string[]): boolean {
  return paths.some(
    (path) => path === folder || path.startsWith(`${folder}${sep}`),
  );
}

// The scripts in the folder's package.json; none without one.
function scriptsOf(folder: string): string[] {
  const file = join(folder, "package.json");
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, "utf8")) as {
      scripts?: Record<string, string>;
    };
    return Object.keys(data.scripts ?? {});
  } catch {
    return [];
  }
}

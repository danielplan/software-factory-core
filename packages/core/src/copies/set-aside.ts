// A working copy that lost its link to git: finding out, and moving its
// folder aside (never deleting it: it may hold work that was not committed).

import {
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  renameSync,
} from "node:fs";
import { basename, join } from "node:path";

import { run } from "../processes.ts";

// Git can use the copy and it is its own folder (a broken link would
// otherwise lead git to a repository further up).
export async function linkedToGit(path: string): Promise<boolean> {
  if (!existsSync(join(path, ".git"))) return false;
  try {
    const top = await run("git", ["-C", path, "rev-parse", "--show-toplevel"]);
    return realpathSync(top.trim()) === realpathSync(path);
  } catch {
    return false;
  }
}

// The folder is there and not empty (an empty one is simply used).
export function keepsFiles(path: string): boolean {
  return existsSync(path) && readdirSync(path).length > 0;
}

// Moves the folder into `kept/` beside the copies, under a name that is not
// a copy's; returns where it went.
export function setAside(path: string, workspaces: string): string {
  const keptFolder = join(workspaces, "kept");
  mkdirSync(keptFolder, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replace(/\.\d+Z$/, "")
    .replace(/[-:]/g, "")
    .replace("T", "-");
  const name = `${basename(path)}-${stamp}`;
  let kept = join(keptFolder, name);
  let n = 1;
  while (existsSync(kept)) kept = join(keptFolder, `${name}-${++n}`);
  renameSync(path, kept);
  return kept;
}

// By default a line on the server's log.
export function tellRemade(copy: string, kept: string): void {
  process.stderr.write(
    `The working copy ${copy} had lost its link to git: remade it, the old folder is kept at ${kept}\n`,
  );
}

// A copy's settings files (.env, .env.test …): never the owner's, never
// committed; the examples the project keeps (.env.example …) are.

import { readdirSync } from "node:fs";
import { basename, sep } from "node:path";

import { run } from "../processes.ts";

// Settings files an older factory may have copied into a copy; removed when
// found, so a job never runs with the owner's settings. The examples the
// project keeps (.env.example, .env.test.example …) stay: a copy's own
// settings start from them.
export const EXAMPLE_END = ".example";

function isSettings(file: string): boolean {
  const name = basename(file);
  return name === ".env" || name.startsWith(".env.");
}

export function isExample(file: string): boolean {
  return isSettings(file) && file.endsWith(EXAMPLE_END);
}

export function leftOut(file: string): boolean {
  return isSettings(file) && !isExample(file);
}

// Stages everything in a copy but its own settings files (.env, .env.test
// …, made from the examples), which are never committed; changes to the examples are.
// Everything is added the plain way, which keeps to the project's
// .gitignore, and a settings file the project does not ignore is taken out
// again. (Leaving them out by name instead makes git refuse when the
// project ignores them already.)
export async function stageAllButSettings(folder: string): Promise<void> {
  const git = (...args: string[]) => run("git", ["-C", folder, ...args]);
  await git("add", "--all");
  const staged = (await git("diff", "--cached", "--name-only", "-z"))
    .split("\0")
    .filter(leftOut);
  if (staged.length > 0)
    await git("rm", "--cached", "--quiet", "--", ...staged);
}

// The settings files (.env, .env.*) anywhere in a copy but in installed
// packages and git's own folder, as paths inside it. (fs.globSync's "**"
// does not find them on every Node version: the folder is read instead.)
export function settingsIn(folder: string): string[] {
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .map((path) => path.split(sep).join("/"))
    .filter(
      (path) =>
        /(^|\/)\.env(\.[\w.-]+)?$/.test(path) &&
        !/(^|\/)(node_modules|\.git)\//.test(path),
    );
}

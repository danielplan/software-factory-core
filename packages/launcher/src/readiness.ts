// Is a product ready to start: are its packages installed and current, is a
// build it needs fresh.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// How the packages need installing, or null when they are current. npm
// writes node_modules/.package-lock.json on every install; when the folder's
// package-lock.json is newer (after an update), the packages are out of date.
// Without a package-lock.json, packages are installed once, when missing.
export function packagesNeeded(folder: string): "ci" | "install" | null {
  if (!existsSync(join(folder, "package.json"))) return null;
  const installed = join(folder, "node_modules", ".package-lock.json");
  const wanted = join(folder, "package-lock.json");
  if (!existsSync(wanted))
    return existsSync(join(folder, "node_modules")) ? null : "install";
  if (!existsSync(installed)) return "ci";
  return statSync(wanted).mtimeMs > statSync(installed).mtimeMs ? "ci" : null;
}

// True when `output` is newer than every input (files or folders).
export function isFresh(
  folder: string,
  check: { output: string; inputs: string[] },
): boolean {
  const output = join(folder, check.output);
  if (!existsSync(output)) return false;
  const built = statSync(output).mtimeMs;
  return check.inputs.every((input) => newest(join(folder, input)) <= built);
}

function newest(path: string): number {
  if (!existsSync(path)) return 0;
  const info = statSync(path);
  if (!info.isDirectory()) return info.mtimeMs;
  let latest = info.mtimeMs;
  for (const entry of readdirSync(path)) {
    if (entry === "node_modules") continue;
    latest = Math.max(latest, newest(join(path, entry)));
  }
  return latest;
}

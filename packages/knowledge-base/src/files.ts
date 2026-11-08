// The files a check looks at: every file under the root, as paths relative
// to it with forward slashes, without the folders that are never checked
// (installed packages, git's own folder, coverage reports).

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { GIT } from "./git.ts";

export const SKIPPED_FOLDERS = ["node_modules", ".git", "coverage"];

export function filesUnder(root: string, skipped = SKIPPED_FOLDERS): string[] {
  const found: string[] = [];
  const walk = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        if (!skipped.includes(entry.name)) walk(path);
      } else if (entry.isFile()) {
        found.push(relative(root, path).replaceAll("\\", "/"));
      }
    }
  };
  walk(root);
  return found.sort((a, b) => a.localeCompare(b));
}

export const isMarkdown = (file: string): boolean => file.endsWith(".md");

// The paths among these that git ignores (settings files, build output);
// none when the root is not in a git repository.
export function ignoredByGit(root: string, paths: string[]): Set<string> {
  if (paths.length === 0) return new Set();
  try {
    const out = execFileSync(
      GIT,
      ["-C", root, "check-ignore", "--no-index", "--stdin"],
      {
        encoding: "utf8",
        input: paths.join("\n"),
        stdio: ["pipe", "pipe", "ignore"],
      },
    );
    return new Set(out.split("\n").filter(Boolean));
  } catch {
    // Exit code 1: none is ignored; or no git repository here.
    return new Set();
  }
}

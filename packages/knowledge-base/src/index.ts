// The knowledge base's checks, for a company's repository or the core's
// own: links and anchors and the paths written in backticks in every
// Markdown file, and the knowledge-base rules inside every `context/` folder.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { filesUnder, isMarkdown, SKIPPED_FOLDERS } from "./files.ts";
import { checkLinks } from "./links.ts";
import { HISTORY, indexFiles } from "./paths.ts";
import type { Problem } from "./problem.ts";
import { checkRules } from "./rules.ts";

export { GIT } from "./git.ts";
export type { Problem } from "./problem.ts";

// The empty knowledge base a new company starts with (its context/ folder).
export const templateFolder = join(import.meta.dirname, "..", "template");

export type CheckOptions = {
  // Folder names never looked into (default: node_modules, .git, coverage).
  skipped?: string[];
  // Pages that are history, whose paths are not checked (default: runs,
  // CHANGES.md, CHANGELOG.md, context/sources/).
  history?: RegExp[];
};

export async function checkDocs(
  root: string,
  options: CheckOptions = {},
): Promise<Problem[]> {
  const folder = resolve(root);
  const files = filesUnder(folder, options.skipped ?? SKIPPED_FOLDERS);
  const markdown = files.filter(isMarkdown);
  const pages = new Map(
    markdown.map((file) => [file, readFileSync(join(folder, file), "utf8")]),
  );
  const links = await checkLinks(markdown, {
    root: folder,
    index: indexFiles(files),
    history: options.history ?? HISTORY,
  });
  return [...links, ...checkRules(pages)].sort(
    (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0),
  );
}

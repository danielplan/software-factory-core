// The knowledge base's checks, for a company's repository or the core's
// own: links and anchors and the paths written in backticks in every
// Markdown file, and the knowledge-base rules inside every `context/` folder,
// in the folder checked when it is a knowledge base (a project's docs/), and
// in the folders named as knowledge bases (the core's own docs/).

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { filesUnder, isMarkdown, SKIPPED_FOLDERS } from "./files.ts";
import { checkLinks } from "./links.ts";
import { HISTORY, indexFiles } from "./paths.ts";
import type { Problem } from "./problem.ts";
import { checkRules } from "./rules.ts";

export { GIT } from "./git.ts";
export type { Problem } from "./problem.ts";
export { SKELETON } from "./rules.ts";

// The empty knowledge base a new company starts with (copied into its docs/).
export const templateFolder = join(import.meta.dirname, "..", "template");

export type CheckOptions = {
  // Folder names never looked into (default: node_modules, .git, coverage).
  skipped?: string[];
  // Folders from the root left out as if they were not there (the core's
  // own factory/: its data, and the paths its guides write about a
  // company's factory folder are not about it).
  leftOut?: string[];
  // Pages that are history, whose paths are not checked (default: runs,
  // CHANGES.md, CHANGELOG.md, context/sources/).
  history?: RegExp[];
  // The folder checked is a knowledge base itself (a project's docs/): every
  // page in it follows the knowledge base's rules.
  knowledgeBase?: boolean;
  // Folders from the root that are knowledge bases (the core's docs/): every
  // page in them follows the knowledge base's rules and each keeps the
  // shape, while the rest of the root gets only the link and path checks.
  knowledgeBases?: string[];
};

export async function checkDocs(
  root: string,
  options: CheckOptions = {},
): Promise<Problem[]> {
  const folder = resolve(root);
  const files = filesUnder(folder, options.skipped ?? SKIPPED_FOLDERS).filter(
    (file) =>
      !(options.leftOut ?? []).some((out) => file.startsWith(`${out}/`)),
  );
  const markdown = files.filter(isMarkdown);
  const pages = new Map(
    markdown.map((file) => [file, readFileSync(join(folder, file), "utf8")]),
  );
  const bases = (options.knowledgeBases ?? []).map((base) =>
    base.replace(/\/$/, ""),
  );
  const sources = [
    ...(options.knowledgeBase ? [/^sources\//] : []),
    ...bases.map((base) => new RegExp(`^${escaped(base)}/sources/`)),
  ];
  const links = await checkLinks(markdown, {
    root: folder,
    index: indexFiles(files),
    history: options.history ?? [...HISTORY, ...sources],
  });
  return [...links, ...checkRules(pages, options.knowledgeBase, bases)].sort(
    (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0),
  );
}

// A folder's name, matched as it is written in a pattern.
const escaped = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

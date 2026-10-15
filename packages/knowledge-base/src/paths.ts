// File and folder paths written in backticks in the Markdown pages, such as
// `src/features/orders/`, must exist: a page that names a file which was
// moved or deleted is the most common kind of stale docs. It runs as a remark
// plugin, so each problem is reported with its page and line.
//
// To avoid false alarms only clear paths are checked:
// - a path may point next to the page, into the page's project (the folder
//   with a package.json), from the root, or into any project; it is checked
//   only when its first folder exists next to the page, in the page's
//   project or at the root;
// - placeholders (`<area>`, `*`, `{a,b}`, `NNN`, `issue-N`, `…`), spaces,
//   addresses and commands are skipped;
// - paths git ignores (settings files, build output) are skipped;
// - history (runs, change logs, sources) is not checked.

import type { InlineCode, Root } from "mdast";
import type { Plugin } from "unified";
import { relative, resolve } from "node:path";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

import { ignoredByGit } from "./files.ts";

// Pages that are history: they say what was true then.
export const HISTORY = [
  /(^|\/)runs\//,
  /(^|\/)CHANGES\.md$/,
  /(^|\/)CHANGELOG\.md$/,
  /(^|\/)context\/sources\//,
];

export type FileIndex = { known: Set<string>; projects: string[] };

// The text of a code span when it looks like a path, otherwise null.
export function pathIn(code: string): string | null {
  const text = code.trim().replace(/^\.\//, "");
  if (!text.includes("/") || text.length > 200) return null;
  if (
    /[\s<>*{}$…|"'`()[\]=,;]|\.\.\.|NNN|\/\/|^[a-z]+:|^[-@~#]|^\.\.?\//i.test(
      text,
    )
  )
    return null;
  // A single capital letter is a placeholder, as in `branch/issue-N`.
  if (/(^|[/._-])[A-Z]($|[/._-])/.test(text)) return null;
  return text;
}

// Every file and folder, and the projects (folders with a package.json).
export function indexFiles(files: string[]): FileIndex {
  const known = new Set<string>();
  const projects: string[] = [];
  for (const file of files) {
    const parts = file.split("/");
    for (let index = 1; index <= parts.length; index += 1)
      known.add(parts.slice(0, index).join("/"));
    if (parts.at(-1) === "package.json" && parts.length > 1)
      projects.push(parts.slice(0, -1).join("/"));
  }
  return { known, projects };
}

function projectOf(page: string, projects: string[]): string | null {
  return (
    projects
      .filter((project) => page.startsWith(`${project}/`))
      .sort((a, b) => b.length - a.length)[0] ?? null
  );
}

// The places a path written on a page may point to, from the root. An empty
// list means the path is not clear enough to check.
export function candidatesFor(
  written: string,
  page: string,
  index: FileIndex,
): string[] {
  const clean = written.replace(/\/$/, "");
  const first = clean.split("/")[0] ?? "";
  const pageFolder = page.includes("/")
    ? page.slice(0, page.lastIndexOf("/"))
    : "";
  const near = [pageFolder, projectOf(page, index.projects) ?? "", ""].map(
    (base) => (base ? `${base}/` : ""),
  );
  if (!near.some((place) => index.known.has(`${place}${first}`))) return [];
  const places = [...near, ...index.projects.map((project) => `${project}/`)];
  return [...new Set(places.map((place) => `${place}${clean}`))];
}

export type MissingPath = { code: InlineCode; places: string[] };

// The paths written on one page that exist in none of their places.
export function missingPaths(
  codes: InlineCode[],
  page: string,
  index: FileIndex,
  history = HISTORY,
): MissingPath[] {
  if (history.some((pattern) => pattern.test(page))) return [];
  const missing: MissingPath[] = [];
  for (const code of codes) {
    const written = pathIn(code.value);
    if (!written) continue;
    const slash = written.endsWith("/") ? "/" : "";
    const places = candidatesFor(written, page, index);
    if (places.length > 0 && !places.some((place) => index.known.has(place)))
      missing.push({ code, places: places.map((place) => `${place}${slash}`) });
  }
  return missing;
}

export type PathsSettings = {
  root: string;
  index: FileIndex;
  history: RegExp[];
};

// The remark plugin: each missing path is a message on its page.
export const remarkExistingPaths: Plugin<[PathsSettings], Root> = function (
  settings,
) {
  return (tree: Root, file: VFile): void => {
    const page = relative(
      settings.root,
      resolve(file.cwd, file.path),
    ).replaceAll("\\", "/");
    const codes: InlineCode[] = [];
    visit(tree, "inlineCode", (node) => {
      codes.push(node);
    });
    const missing = missingPaths(codes, page, settings.index, settings.history);
    const ignored = ignoredByGit(
      settings.root,
      missing.flatMap(({ places }) => places),
    );
    for (const { code, places } of missing) {
      if (places.some((place) => ignored.has(place))) continue;
      file.message(`Path \`${code.value}\` does not exist`, code);
    }
  };
};

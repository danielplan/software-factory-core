import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "vitest";

// The app's structure, after Bulletproof React's project structure: shared
// folders (api, components, hooks, lib, i18n), one folder per area in
// features/, and app/ that puts them together; plain file names, and one
// component per .tsx file, named after the file. Import rules live in
// .dependency-cruiser.cjs. See BLUEPRINT.md.

const root = join(import.meta.dirname, "..");
const source = join(root, "src");

// shadcn's generated pieces keep shadcn's own layout (several parts per file).
const generated = /^components\/ui\//;
const entryFiles = new Set(["main.tsx", "vite-env.d.ts", "theme.css"]);

function sourceFiles(): string[] {
  return readdirSync(source, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(source, join(entry.parentPath, entry.name)).replaceAll(
        "\\",
        "/",
      ),
    )
    .filter((path) => !generated.test(path) && !entryFiles.has(path));
}

const fileName = (path: string) => path.split("/").pop() ?? "";
const baseName = (path: string) => fileName(path).replace(/\.(tsx?)$/, "");
const pascal = (name: string) =>
  name.replace(/(^|-)([a-z0-9])/g, (_match, _dash, letter: string) =>
    letter.toUpperCase(),
  );
const camel = (name: string) =>
  name.replace(/-([a-z0-9])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );

// Translations are JSON files, one per language and area:
// i18n/locales/<language>/<area>.json.
const translation = /^i18n\/locales\/[a-z]{2}\/[a-z]+(-[a-z]+)*\.json$/;

test("files are named in lowercase words with dashes, with no catch-all names", () => {
  const named = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.schema)?\.(ts|tsx)$/;
  const catchAll = /^(utils|helpers|common|misc|styles|components|index)\./;
  const wrong = sourceFiles().filter(
    (path) =>
      !translation.test(path) &&
      (!named.test(fileName(path)) || catchAll.test(fileName(path))),
  );
  expect(wrong).toEqual([]);
});

test("a .tsx file defines at most one component, named after the file", () => {
  const component =
    /^(?:export )?(?:function|const) ([A-Z]\w*)\s*(?:<|\(|=\s*\()/gm;
  const wrong = sourceFiles()
    .filter((path) => path.endsWith(".tsx"))
    .flatMap((path) => {
      const names = [
        ...readFileSync(join(source, path), "utf8").matchAll(component),
      ].map((match) => match[1]);
      const expected = pascal(baseName(path));
      return names.length === 0 || (names.length === 1 && names[0] === expected)
        ? []
        : [`${path}: ${names.join(", ")}`];
    });
  expect(wrong).toEqual([]);
});

test("a hook file exports the hook it is named after", () => {
  const wrong = sourceFiles()
    .filter((path) => /^use-.*\.ts$/.test(fileName(path)))
    .filter((path) => {
      const hook = camel(baseName(path));
      // The hook may take type parameters: useRecordTable<Row>(…).
      return !new RegExp(`export function ${hook}[(<]`).test(
        readFileSync(join(source, path), "utf8"),
      );
    });
  expect(wrong).toEqual([]);
});

test("every feature folder is an area named in the import rules", () => {
  const rules = readFileSync(join(root, ".dependency-cruiser.cjs"), "utf8");
  const areas = /const areas =\s*"\(([^)]+)\)"/.exec(rules)?.[1]?.split("|");
  expect(areas).toBeDefined();
  const known = new Set(areas);
  const folders = readdirSync(join(source, "features"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  expect(folders.filter((folder) => !known.has(folder))).toEqual([]);
  expect([...known].filter((folder) => !folders.includes(folder))).toEqual([]);
});

// Where each kind of file may live. Components (.tsx) sit in app/ and in the
// components folders; hooks in api/ (the query hooks), hooks/, or in an
// area's hooks/; an area keeps its configuration and pure helpers (.ts) at
// its root.
const places: readonly RegExp[] = [
  /^app\/[^/]+\.tsx?$/,
  /^api\/[^/]+\.ts$/,
  /^components\/layout\/[^/]+\.tsx?$/,
  /^hooks\/use-[^/]+\.ts$/,
  /^lib\/[^/]+\.ts$/,
  /^i18n\/[^/]+\.ts$/,
  translation,
  /^features\/[^/]+\/components\/[^/]+\.tsx$/,
  /^features\/[^/]+\/hooks\/use-[^/]+\.ts$/,
  /^features\/[^/]+\/(?!use-)[^/]+\.ts$/,
];

test("every file sits in a folder meant for its kind", () => {
  const wrong = sourceFiles().filter(
    (path) => !places.some((place) => place.test(path)),
  );
  expect(wrong).toEqual([]);
});

// theme.css holds only the fonts, the design tokens and element rules in
// @layer base: screens are styled with Tailwind classes on the elements. A
// rule outside a layer would beat every Tailwind class on its element.
test("theme.css has only fonts, tokens and @layer base at its top level", () => {
  const css = readFileSync(join(source, "theme.css"), "utf8").replaceAll(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const allowed = new Set([
    "@font-face",
    ":root",
    "@theme inline",
    "@layer base",
  ]);
  const topLevel: string[] = [];
  let depth = 0;
  let prelude = "";
  for (const character of css) {
    if (character === "{") {
      if (depth === 0) topLevel.push(prelude.trim());
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      prelude = "";
    } else if (character === ";" && depth === 0) {
      prelude = "";
    } else if (depth === 0) {
      prelude += character;
    }
  }
  expect(topLevel.filter((rule) => !allowed.has(rule))).toEqual([]);
});

// Colours, type, spacing scales and breakpoints come from the theme's named
// tokens (theme.css): a class like text-[13px], bg-[#83d6b5] or max-[720px]:
// would bypass them. Arbitrary grid layouts and data-[...] variants are fine.
test("screens use the theme's named values, not one-off sizes or colours", () => {
  const sizeOrColour = /#|\d(?:px|em|rem)/;
  // "max-[720px]:p-4" → utility "max", value "720px"; "md:text-[13px]" → "text", "13px".
  const isOneOff = (word: string) => {
    const open = word.indexOf("-[");
    if (open === -1) return false;
    const utility = word.slice(0, open).split(":").pop() ?? "";
    const value = word.slice(open + 2, word.indexOf("]", open));
    if (utility.startsWith("grid") || utility.includes("data")) return false;
    return utility === "max" || utility === "min" || sizeOrColour.test(value);
  };
  const found = sourceFiles()
    .filter((path) => /\.tsx?$/.test(path))
    .flatMap((path) =>
      readFileSync(join(source, path), "utf8")
        .split(/[\s"'`]+/)
        .filter((word) => isOneOff(word))
        .map((word) => `${path}: ${word}`),
    );
  expect(found).toEqual([]);
});

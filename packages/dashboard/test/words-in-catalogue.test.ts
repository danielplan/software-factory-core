import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

import ts from "typescript";

// Every word the page shows goes through the words (src/i18n), in each
// language: a screen's own JSX text, or a label for a screen reader, a
// tooltip or a field's hint written straight in, is English only. The
// check reads each screen as TypeScript and names every such word.

const SRC = join(import.meta.dirname, "..", "src");
// The words themselves, and the shadcn pieces (no words of their own).
const LEFT_OUT = ["i18n", join("components", "ui")];
const ATTRIBUTES = new Set([
  "title",
  "aria-label",
  "placeholder",
  "alt",
  "label",
]);
// Names that are the same in every language (the wordmark is lower case).
const ALLOWED = new Set([
  "Kobble",
  "kobble",
  "Sprocket",
  "GitHub",
  "Jira",
  "Claude Code",
]);
const isAllowed = (text: string) =>
  ALLOWED.has(text) ||
  // An address or a path, or a keyboard shortcut (⌘J).
  /^(https?:\/\/|\/|#|\.|⌘)/.test(text);

function screens(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory())
      return LEFT_OUT.includes(relative(SRC, path)) ? [] : screens(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

// The words written straight into one screen, as "file:line: words".
export function wordsIn(file: string, source: string): string[] {
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: string[] = [];
  const say = (node: ts.Node, text: string) => {
    const { line } = tree.getLineAndCharacterOfPosition(node.getStart());
    found.push(`${file}:${String(line + 1)}: ${text}`);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (/\p{L}/u.test(text) && !isAllowed(text)) say(node, text);
    } else if (
      ts.isJsxAttribute(node) &&
      ATTRIBUTES.has(node.name.getText(tree)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      const text = node.initializer.text.trim();
      if (/\p{L}/u.test(text) && !isAllowed(text)) say(node, text);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
}

test("every word a screen shows is in the words, in each language", () => {
  const found = screens(SRC).flatMap((path) =>
    wordsIn(relative(SRC, path), readFileSync(path, "utf8")),
  );
  assert.deepEqual(
    found,
    [],
    `Words written straight into a screen:\n${found.join("\n")}`,
  );
});

test("the check finds JSX text and written labels, not names or addresses", () => {
  const found = wordsIn(
    "x.tsx",
    `const a = <p>Hello</p>;
const b = <b aria-label="Close" title={t.x}>{t.y}</b>;
const c = <a href="https://x" title="GitHub">Kobble</a>;
const d = <input placeholder="/path" />;`,
  );
  assert.deepEqual(found, ["x.tsx:1: Hello", "x.tsx:2: Close"]);
});

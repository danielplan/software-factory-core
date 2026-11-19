import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

// Page-level files: the global styles sit in Tailwind's base layer, so
// Tailwind classes can override them, and the page has an icon.

const project = (path: string) => resolve(import.meta.dirname, "..", path);
const read = (path: string) => readFileSync(project(path), "utf8");

// Top-level rules of a style sheet, with nested blocks skipped.
function topLevelSelectors(css: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (character === "{") {
      if (depth === 0) selectors.push(current.trim());
      depth += 1;
      current = "";
    } else if (character === "}") {
      depth -= 1;
      current = "";
    } else if (character === ";" && depth === 0) current = "";
    else if (depth === 0) current += character;
  }
  return selectors;
}

test("global element styles are inside @layer base", () => {
  const outside = topLevelSelectors(read("src/theme.css")).filter(
    (selector) =>
      !selector.startsWith("@") &&
      !selector.startsWith(":root") &&
      selector.split(",").some((part) => /^[a-z*]/.test(part.trim())),
  );
  expect(outside).toEqual([]);
});

test("the page has an icon that exists", () => {
  const html = read("index.html");
  const icon = /<link rel="icon"[^>]*href="\/([^"]+)"/.exec(html)?.[1];
  expect(icon).toBeDefined();
  expect(existsSync(project(`public/${icon}`))).toBe(true);
});

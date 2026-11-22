import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { cn, textSizes } from "../src/lib/classes.ts";

// cn joins class names, the later one winning where two set the same thing,
// and knows the theme's own type sizes.

test("a later class of the same kind wins", () => {
  expect(cn("p-2", "p-4")).toBe("p-4");
  expect(cn("text-body", "text-title")).toBe("text-title");
});

test("a type size and a colour both stay", () => {
  expect(cn("text-metric", "text-destructive")).toBe(
    "text-metric text-destructive",
  );
});

test("cn knows every type size of the theme", () => {
  const css = readFileSync(
    resolve(import.meta.dirname, "..", "src", "theme.css"),
    "utf8",
  );
  const inTheme = [...css.matchAll(/--text-([\w-]+):/g)].map(
    (match) => match[1],
  );
  const sorted = (names: readonly (string | undefined)[]) =>
    [...names].sort((a = "", b = "") => a.localeCompare(b));
  expect(sorted(textSizes)).toEqual(sorted(inTheme));
});

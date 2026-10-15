import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// The core holds no company (AGENTS.md): the name of the company it grew out
// of, and its products' names, are nowhere in the repository.

const ROOT = join(import.meta.dirname, "..", "..", "..");
// Whole words only: "administrator" or "nanosecond" are fine.
const FORBIDDEN = /\b(santelmo|nano|driver|admin)\b/i;
const THIS_FILE = "packages/core/test/no-company.test.ts";

test("no company's name or products are in the core", () => {
  const files = globSync("**/*", {
    cwd: ROOT,
    exclude: (entry) =>
      ["node_modules", ".git", "coverage", "package-lock.json"].includes(
        entry.name,
      ),
    withFileTypes: true,
  }).filter((entry) => entry.isFile());
  assert.ok(files.length > 20);
  const found = files
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((path) => path.slice(ROOT.length + 1) !== THIS_FILE)
    .flatMap((path) => {
      const word = FORBIDDEN.exec(readFileSync(path, "utf8"))?.[0];
      return word ? [`${path.slice(ROOT.length + 1)}: ${word}`] : [];
    });
  assert.deepEqual(found, []);
});

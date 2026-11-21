import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  allKits,
  librariesIn,
  unlisted,
  unlistedPackagesOf,
} from "../src/index.ts";

// Each kit names one library per job in its conventions; a product uses only
// those and the ones its blueprint adds, and the kits' own starters keep to
// their tables.

const TABLE = `# Rules

## The libraries

Some words.

| Job | Library | Why |
| --- | --- | --- |
| Pages | **React Router** (\`react-router\`, \`react-router-dom\`) | links |
| Device | Expo packages, added with \`npx expo install\` (\`expo-*\`, \`@expo/*\`) | versions |
| Dates | the browser's **Intl** | the platform has it |

## The rules and why

| Not | This |
| --- | --- |
| \`zod\` | no |
`;

test("a libraries table names packages and patterns, not commands or other tables", () => {
  assert.deepEqual(librariesIn(TABLE), [
    "react-router",
    "react-router-dom",
    "expo-*",
    "@expo/*",
  ]);
  assert.deepEqual(librariesIn("# Nothing here"), []);
});

test("a pattern covers every package that matches it", () => {
  const names = librariesIn(TABLE);
  assert.deepEqual(
    unlisted(
      ["react-router", "expo-router", "@expo/metro-runtime", "zod", "expo"],
      names,
    ),
    ["zod", "expo"],
  );
});

test("each kit with rules has a libraries table, and its starter keeps to it", () => {
  for (const kit of allKits) {
    const [conventions] = kit.rules;
    if (!conventions) continue;
    assert.ok(
      librariesIn(readFileSync(conventions, "utf8")).length > 0,
      `${kit.id} names its libraries`,
    );
    if (kit.starter)
      assert.deepEqual(
        unlistedPackagesOf(kit.starter, kit.rules),
        [],
        `${kit.id}'s starter uses only its kit's libraries`,
      );
  }
});

test("a product may add a library in its blueprint; one no table names is said", () => {
  const folder = mkdtempSync(join(tmpdir(), "product-"));
  const [kit] = allKits.filter((one) => one.id === "react-web-app");
  assert.ok(kit);
  writeFileSync(
    join(folder, "package.json"),
    JSON.stringify({
      dependencies: { react: "19", "date-fns": "4", "left-pad": "1" },
      devDependencies: { vitest: "4" },
    }),
  );
  assert.deepEqual(unlistedPackagesOf(folder, kit.rules), [
    "date-fns",
    "left-pad",
  ]);
  writeFileSync(
    join(folder, "BLUEPRINT.md"),
    "# Blueprint\n\n## Libraries\n\n| Job | Library | Why |\n| --- | --- | --- |\n| Time zones | **date-fns** (`date-fns`) | Intl cannot add days |\n",
  );
  assert.deepEqual(unlistedPackagesOf(folder, kit.rules), ["left-pad"]);
});

test("Kobble keeps to its kits: the page to the React web app's libraries and its blueprint", () => {
  const dashboard = join(import.meta.dirname, "..", "..", "dashboard");
  const [kit] = allKits.filter((one) => one.id === "react-web-app");
  assert.ok(kit);
  assert.deepEqual(unlistedPackagesOf(dashboard, kit.rules), []);
});

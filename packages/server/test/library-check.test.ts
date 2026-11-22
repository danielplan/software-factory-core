import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { allKits } from "@software-factory/kits";

import { libraryReport } from "../src/extensions/factory/builder/checks.ts";
import { topCommand } from "../src/top-commands.ts";

// Before a pull request, each product the branch touched uses only the
// libraries its kit's table and its blueprint name; and an agent reads its
// product's kit rules with `software-factory rules <product>`.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");
const AVAILABLE = { kits: allKits, extensions: [] };

function acmeCopy(): string {
  const copy = mkdtempSync(join(tmpdir(), "acme-"));
  cpSync(ACME, copy, { recursive: true });
  return copy;
}

test("a touched product with a library no table names fails, with what to do", () => {
  const copy = acmeCopy();
  assert.equal(libraryReport(copy, AVAILABLE, ["shop/src/app.tsx"]), "");
  const file = join(copy, "shop", "package.json");
  const json = JSON.parse(readFileSync(file, "utf8")) as {
    dependencies: Record<string, string>;
  };
  json.dependencies["home-made-i18n"] = "1.0.0";
  writeFileSync(file, JSON.stringify(json));
  const report = libraryReport(copy, AVAILABLE, ["shop/package.json"]);
  assert.match(report, /Shop: libraries no table names/);
  assert.match(report, /`home-made-i18n`/);
  assert.match(report, /## Libraries/);
  assert.equal(libraryReport(copy, AVAILABLE, ["orders/src/main.ts"]), "");
});

async function said(args: string[], from: string) {
  const lines: string[] = [];
  const code = await topCommand(args, from, (line) => lines.push(line));
  return { code, said: lines.join("\n") };
}

test("rules prints a product's kit rules, with its libraries table", async () => {
  const listed = await said(["rules"], ACME);
  assert.equal(listed.code, 0);
  assert.match(
    listed.said,
    /shop: react-web-app \(npx software-factory rules shop\)/,
  );
  const shop = await said(["rules", "shop"], ACME);
  assert.equal(shop.code, 0);
  assert.match(shop.said, /## The libraries/);
  assert.match(shop.said, /`react-i18next`/);
  assert.match(shop.said, /# React web app lessons/);
  const missing = await said(["rules", "nope"], ACME);
  assert.equal(missing.code, 1);
  assert.match(missing.said, /no product “nope”/);
});

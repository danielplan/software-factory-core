import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { copyStarter, starterName } from "@software-factory/core";

import {
  expoApp,
  nestjsBackend,
  reactWebApp,
  sveltekitApp,
  typescriptPackage,
} from "../src/index.ts";

// The kits' starters: a whole empty product per kind, copied into a new
// product's folder and given its name. The web and phone starters carry a
// prototype mode and the check that none of it reaches the real app.

const STARTERS = [
  { kit: reactWebApp, name: "new-web-app", prototype: true },
  { kit: expoApp, name: "new-phone-app", prototype: true },
  { kit: nestjsBackend, name: "new-backend", prototype: false },
];

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
const scriptsOf = (folder: string) =>
  readJson(join(folder, "package.json")).scripts as Record<string, string>;

// What `npm run verify` runs: the script, or the file it hands over to.
function verifyOf(folder: string): string {
  const script = join(folder, "scripts", "verify.cjs");
  return [
    scriptsOf(folder).verify ?? "",
    existsSync(script) ? readFileSync(script, "utf8") : "",
  ].join("\n");
}

test("each starter is a product with its standards, checks and blueprint", () => {
  for (const { kit, name } of STARTERS) {
    const folder = kit.starter ?? "";
    assert.equal(starterName(folder), name);
    for (const file of ["BLUEPRINT.md", "README.md", "_gitignore"])
      assert.ok(existsSync(join(folder, file)), `${kit.id}: ${file}`);
    assert.ok(!existsSync(join(folder, "node_modules")), kit.id);
    const verify = verifyOf(folder);
    for (const check of ["lint", "typecheck", "deadcode", "duplicates"])
      assert.ok(verify.includes(check), `${kit.id}: ${check}`);
  }
});

test("the starters with a prototype mode check that the real app has none of it", () => {
  for (const { kit } of STARTERS.filter((s) => s.prototype)) {
    const folder = kit.starter ?? "";
    const scripts = scriptsOf(folder);
    for (const script of ["prototype", "prototype:live", "check:prototypes"])
      assert.ok(scripts[script], `${kit.id}: ${script}`);
    assert.match(verifyOf(folder), /check:prototypes/, kit.id);
    assert.match(
      readFileSync(join(folder, "README.md"), "utf8"),
      /FACTORY_WORLD_URL/,
      kit.id,
    );
  }
});

test("the kits without a starter make a product with the framework's own", () => {
  assert.equal(sveltekitApp.starter, undefined);
  assert.equal(typescriptPackage.starter, undefined);
});

test("a copied starter is the product, under the product's name", () => {
  for (const { kit, name } of STARTERS) {
    const folder = join(mkdtempSync(join(tmpdir(), "starter-")), "shop");
    assert.equal(copyStarter(kit.starter ?? "", folder, "My Shop"), "my-shop");
    assert.equal(readJson(join(folder, "package.json")).name, "my-shop");
    assert.ok(existsSync(join(folder, ".gitignore")), kit.id);
    assert.ok(!existsSync(join(folder, "_gitignore")), kit.id);
    const lock = join(folder, "package-lock.json");
    if (existsSync(lock))
      assert.ok(!readFileSync(lock, "utf8").includes(name), kit.id);
  }
});

// A starter of one's own: its name in text files, a picture, and what an
// earlier try left behind.
function madeUpStarter(): string {
  const starter = mkdtempSync(join(tmpdir(), "made-up-starter-"));
  writeFileSync(
    join(starter, "package.json"),
    JSON.stringify({ name: "new-thing" }),
  );
  writeFileSync(join(starter, "_gitignore"), "dist/\n");
  mkdirSync(join(starter, "src"));
  writeFileSync(join(starter, "src", "keys.ts"), 'const key = "new-thing-x";');
  writeFileSync(
    join(starter, "icon.bin"),
    Buffer.from([0, ...Buffer.from("new-thing")]),
  );
  for (const left of ["node_modules", "dist"]) {
    mkdirSync(join(starter, left));
    writeFileSync(join(starter, left, "file.js"), "");
  }
  return starter;
}

test("the copy renames text files only and leaves out installs and builds", () => {
  const folder = join(mkdtempSync(join(tmpdir(), "copy-")), "app");
  assert.equal(
    copyStarter(madeUpStarter(), folder, "2 Garden tools!"),
    "garden-tools",
  );
  assert.equal(
    readFileSync(join(folder, "src", "keys.ts"), "utf8"),
    'const key = "garden-tools-x";',
  );
  assert.ok(readFileSync(join(folder, "icon.bin")).includes("new-thing"));
  assert.equal(readFileSync(join(folder, ".gitignore"), "utf8"), "dist/\n");
  assert.ok(!existsSync(join(folder, "node_modules")));
  assert.ok(!existsSync(join(folder, "dist")));
});

test("a starter without a package name is refused", () => {
  const none = mkdtempSync(join(tmpdir(), "no-starter-"));
  assert.throws(() => starterName(none), /has no package.json/);
  writeFileSync(join(none, "package.json"), JSON.stringify({ name: "" }));
  assert.throws(() => starterName(none), /has no package name/);
});

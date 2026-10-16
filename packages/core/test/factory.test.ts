import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  assembleFactory,
  companySchema,
  defineExtension,
  defineKit,
  findProducts,
  loadFactory,
  readProduct,
} from "../src/index.ts";
import { ACME, available, voice } from "./stand-ins.ts";

// A company's factory: its products found from their own descriptions, the
// kits and extensions it uses, and everything they add.

test("the example company: its products, their kits, the parts and settings they add", () => {
  const factory = loadFactory(ACME, available);
  assert.ok(!("problem" in factory));
  assert.deepEqual(factory.problems, []);
  assert.equal(factory.company.name, "Acme");
  assert.deepEqual(
    factory.products.map((p) => [p.id, p.kit]),
    [
      ["orders", "nestjs-backend"],
      ["shop", "react-web-app"],
    ],
  );
  // The kit's usual commands, with the product's own winning.
  const orders = factory.products.find((p) => p.id === "orders");
  assert.deepEqual(orders?.commands, {
    verify: "npm run verify",
    start: "npm run start:dev",
  });
  assert.equal(orders.folder, join(ACME, "..", "orders"));
  // A part per product (from its kit), each after what it needs, then the
  // core extensions' parts.
  assert.deepEqual(
    factory.parts.map((p) => p.id),
    ["orders", "shop", "runner"],
  );
  assert.deepEqual(
    factory.extensions.map((e) => e.id),
    ["system-tab", "github-runner"],
  );
  assert.deepEqual(
    factory.settings.map((g) => g.id),
    ["github"],
  );
  assert.deepEqual(
    factory.guides.map((g) => g.file),
    ["guides/cards.md", "guides/web.md"],
  );
});

test("core extensions can be switched off, add-ons are chosen by name", () => {
  const company = companySchema.parse({
    name: "Beta",
    extensions: ["voice"],
    without: ["github-runner"],
  });
  const factory = assembleFactory(company, [], available);
  assert.deepEqual(factory.problems, []);
  assert.deepEqual(
    factory.extensions.map((e) => e.id),
    ["system-tab", "voice"],
  );
  assert.deepEqual(factory.parts, []);
  assert.equal(voice.core, false);
});

test("what does not fit is said in plain words before anything starts", () => {
  const company = companySchema.parse({
    name: "Beta",
    extensions: ["telepathy"],
    kits: ["react-web-app", "cobol-app"],
  });
  const root = companyWith({
    site: { kind: "react-web-app", dependsOn: ["api"] },
    tool: { kind: "rust-app" },
  });
  const found = findProducts(root);
  const factory = assembleFactory(company, found.products, available);
  assert.deepEqual(factory.problems, [
    'there is no extension "telepathy"',
    'there is no kit "cobol-app"',
    '"tool" is a rust-app, but the company uses no kit for that kind',
    '"site" needs "api", which is not one of the products',
    '"site" depends on "api", which is not in the list',
  ]);
});

test("products are found from their descriptions in products/; one that cannot be read says why", () => {
  const root = companyWith({ a: {}, b: { id: "a" }, c: { id: "Not An Id" } });
  mkdirSync(join(root, "products", "d"));
  writeFileSync(join(root, "products", "d", "product.json"), "{ not json");
  mkdirSync(join(root, "products", "no-description"));
  const found = findProducts(root);
  assert.deepEqual(
    found.products.map((p) => p.id),
    ["a"],
  );
  assert.equal(found.problems.length, 3);
  assert.match(
    found.problems[0] ?? "",
    /products\/b\/product\.json: its id is "a", but its folder is "b"/,
  );
  assert.match(found.problems[1] ?? "", /lowercase letters, digits and -/);
  assert.match(found.problems[2] ?? "", /cannot be read/);
  // Defaults: no commands of its own, needs nothing; its code from its
  // description's folder.
  const one = readProduct(join(root, "products", "a", "product.json"));
  assert.ok("product" in one);
  assert.deepEqual(one.product.commands, {});
  assert.deepEqual(one.product.dependsOn, []);
  assert.equal(one.product.folder, join(root, "code", "a"));
  assert.equal(one.product.home, join(root, "products", "a"));
});

test("a company file that cannot be read stops the factory, with why", () => {
  const root = mkdtempSync(join(tmpdir(), "company-"));
  const missing = loadFactory(root, available);
  assert.ok("problem" in missing);
  assert.match(missing.problem, /factory\.json cannot be read/);
  writeFileSync(join(root, "factory.json"), JSON.stringify({ kits: "all" }));
  const wrong = loadFactory(root, available);
  assert.ok("problem" in wrong);
  assert.match(wrong.problem, /name/);
});

test("an extension or kit that is not right is refused at once, with its id", () => {
  assert.throws(
    () => defineExtension({ id: "tab", name: "", about: "x" }),
    /The extension "tab" is not right/,
  );
  assert.throws(
    () =>
      defineKit({
        id: "kit",
        name: "Kit",
        about: "x",
        kind: "Bad Kind",
        commands: {},
      }),
    /The kit "kit" is not right/,
  );
  const plain = defineKit({
    id: "kit",
    name: "Kit",
    about: "x",
    kind: "kit",
    commands: {},
  });
  assert.deepEqual(plain.partsFor({} as never), []);
});

// A factory folder with these products, by folder name (their missing
// fields filled in, their code in code/<folder>).
function companyWith(
  products: Record<string, Record<string, unknown>>,
): string {
  const root = mkdtempSync(join(tmpdir(), "company-"));
  for (const [folder, fields] of Object.entries(products)) {
    mkdirSync(join(root, "products", folder), { recursive: true });
    writeFileSync(
      join(root, "products", folder, "product.json"),
      JSON.stringify({
        id: folder,
        name: "A product",
        kind: "react-web-app",
        code: `../../code/${folder}`,
        ...fields,
      }),
    );
  }
  return root;
}

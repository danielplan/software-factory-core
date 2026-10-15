import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  loadFactory,
  partSchema,
  type Kit,
  type Product,
} from "@software-factory/core";

import { allKits, expoApp, nestjsBackend, reactWebApp } from "../src/index.ts";

// The kits that ship with the core: each recognises its own kind of product
// in existing code and no other, runs it, and makes a new one.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

// A folder with this package.json in it (or none).
function folderWith(file?: Record<string, unknown> | string): string {
  const folder = mkdtempSync(join(tmpdir(), "kit-"));
  if (file !== undefined)
    writeFileSync(
      join(folder, "package.json"),
      typeof file === "string" ? file : JSON.stringify(file),
    );
  return folder;
}

const web = {
  name: "my-shop",
  scripts: { dev: "vite", test: "vitest run" },
  dependencies: { react: "19.0.0" },
  devDependencies: { vite: "7.0.0" },
};
const server = {
  name: "@acme/orders_api",
  scripts: {
    start: "nest start",
    "start:dev": "nest start --watch",
    verify: "x",
  },
  dependencies: { "@nestjs/core": "11.0.0" },
};
const phone = {
  scripts: { start: "expo start", check: "tsc" },
  dependencies: { expo: "54.0.0", react: "19.0.0", "react-native": "0.81.0" },
  devDependencies: { "@vitejs/plugin-react": "5.0.0" },
};

const recognisedBy = (folder: string) =>
  allKits.filter((kit) => kit.detect(folder) !== null).map((kit) => kit.id);

test("each kit recognises its own kind and no other", () => {
  assert.deepEqual(recognisedBy(folderWith(web)), ["react-web-app"]);
  assert.deepEqual(recognisedBy(folderWith(server)), ["nestjs-backend"]);
  // A phone app uses React too, but it is not a web app.
  assert.deepEqual(recognisedBy(folderWith(phone)), ["expo-app"]);
  // React without Vite, no package.json, or one that cannot be read: nothing.
  assert.deepEqual(
    recognisedBy(folderWith({ dependencies: { react: "19.0.0" } })),
    [],
  );
  assert.deepEqual(recognisedBy(folderWith()), []);
  assert.deepEqual(recognisedBy(folderWith("{ not json")), []);
  assert.deepEqual(recognisedBy(folderWith("[1]")), []);
  assert.deepEqual(recognisedBy(folderWith("null")), []);
});

test("the name and the commands come from the package.json", () => {
  assert.deepEqual(reactWebApp.detect(folderWith(web)), {
    name: "My shop",
    commands: { start: "npm run dev", verify: "npm test" },
  });
  assert.deepEqual(nestjsBackend.detect(folderWith(server)), {
    name: "Orders api",
    commands: { start: "npm run start:dev", verify: "npm run verify" },
  });
  const plainServer = folderWith({ dependencies: { "@nestjs/core": "11" } });
  assert.deepEqual(nestjsBackend.detect(plainServer)?.commands, {
    start: "npm start",
  });
  const app = folderWith(phone);
  const found = expoApp.detect(app);
  // Without a name in the package.json, the folder's name.
  assert.match(found?.name ?? "", /^Kit/);
  assert.deepEqual(found?.commands, {
    start: "npm start",
    verify: "npm run check",
  });
  assert.deepEqual(
    reactWebApp.detect(
      folderWith({
        ...web,
        name: "--",
        scripts: {},
        devDependencies: {
          "@vitejs/plugin-react": "5",
        },
      }),
    ),
    { name: "App", commands: {} },
  );
  assert.equal(
    expoApp.detect(folderWith({ ...phone, scripts: {} }))?.commands.start,
    undefined,
  );
});

// A product of this kit, as the core knows it.
function productOf(kit: Kit, fields: Partial<Product> = {}): Product {
  return {
    id: "shop",
    name: "Shop",
    kind: kit.kind,
    code: "../code/shop",
    about: "",
    users: [],
    commands: {},
    dependsOn: [],
    folder: "/code/shop",
    home: "/factory/products/shop",
    ...fields,
  };
}

test("each kit runs a product as one valid part, on the product's port or its own", () => {
  for (const kit of allKits) {
    const [part, ...more] = kit.partsFor(
      productOf(kit, { dependsOn: ["api"] }),
    );
    assert.equal(more.length, 0);
    const checked = partSchema.parse(part);
    assert.equal(checked.id, "shop");
    assert.equal(checked.folder, "/code/shop");
    assert.deepEqual(checked.dependsOn, ["api"]);
    assert.deepEqual(checked.port, { fixed: kit.port });
    assert.match(checked.does, /^The Shop /);
  }
  const web = reactWebApp.partsFor(
    productOf(reactWebApp, { port: 5200, about: "Sells." }),
  )[0]!;
  assert.deepEqual(web.run, [
    "npm",
    "run",
    "dev",
    "--",
    "--port",
    "5200",
    "--strictPort",
    "--host",
    "127.0.0.1",
  ]);
  assert.equal(web.does, "Sells.");
  assert.equal(web.health, "/");
  const server = nestjsBackend.partsFor(
    productOf(nestjsBackend, {
      port: 3100,
      commands: { start: "npm run start:dev" },
    }),
  )[0]!;
  assert.deepEqual(server.run, ["npm", "run", "start:dev"]);
  assert.deepEqual(server.env, { PORT: "3100" });
  assert.equal(server.health, undefined);
  assert.deepEqual(nestjsBackend.partsFor(productOf(nestjsBackend))[0]?.run, [
    "npm",
    "start",
  ]);
  const phoneApp = expoApp.partsFor(productOf(expoApp))[0]!;
  assert.deepEqual(phoneApp.run, [
    "npx",
    "expo",
    "start",
    "--web",
    "--port",
    "8081",
  ]);
  assert.deepEqual(phoneApp.env, { BROWSER: "none", CI: "1" });
  assert.equal(phoneApp.startSeconds, 240);
});

test("each kit makes a new product with the framework's own starter", () => {
  const folder = join("/somewhere", "new-shop");
  assert.deepEqual(reactWebApp.create?.(folder, "New shop"), [
    [
      "npm",
      "create",
      "vite@latest",
      "new-shop",
      "--",
      "--template",
      "react-ts",
      "--no-interactive",
    ],
    ["npm", "install", "--prefix", "new-shop"],
  ]);
  assert.deepEqual(nestjsBackend.create?.(folder, "New shop"), [
    [
      "npx",
      "@nestjs/cli@latest",
      "new",
      "new-shop",
      "--package-manager",
      "npm",
      "--skip-git",
    ],
  ]);
  assert.deepEqual(expoApp.create?.(folder, "New shop"), [
    [
      "npx",
      "create-expo-app@latest",
      "new-shop",
      "--template",
      "blank-typescript",
      "--yes",
    ],
  ]);
});

test("the example company's factory, with the core's kits", () => {
  const factory = loadFactory(ACME, { extensions: [], kits: allKits });
  assert.ok(!("problem" in factory));
  assert.deepEqual(factory.problems, []);
  assert.deepEqual(
    factory.parts.map((part) => part.id),
    ["orders", "shop"],
  );
  const orders = factory.parts.find((part) => part.id === "orders");
  assert.deepEqual(orders?.run, ["npm", "run", "start:dev"]);
});

test("each kit's rules are there", () => {
  const root = join(import.meta.dirname, "..");
  for (const kit of allKits)
    for (const file of kit.rules) assert.ok(existsSync(join(root, file)), file);
});

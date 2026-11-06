import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  detectProducts,
  loadFactory,
  partSchema,
  type Kit,
  type Product,
} from "@software-factory/core";

import {
  allKits,
  expoApp,
  nestjsBackend,
  otherCode,
  reactWebApp,
  sveltekitApp,
  typescriptPackage,
} from "../src/index.ts";

// The kits that ship with the core: each recognises its own kind of product
// in existing code and no other, runs it, and makes a new one.

const ACME = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "examples",
  "acme",
  "factory",
);

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
const svelte = {
  name: "@acme/my-site",
  scripts: { dev: "vite dev", check: "svelte-kit sync && svelte-check" },
  devDependencies: { "@sveltejs/kit": "3.0.0", svelte: "5.0.0", vite: "7.0.0" },
};
const shared = {
  name: "@acme/spec",
  main: "./dist/index.js",
  exports: { ".": "./dist/index.js" },
  scripts: { build: "tsc", dev: "tsc --watch" },
  devDependencies: { typescript: "6.0.0" },
  dependencies: { zod: "4.0.0" },
};
const phone = {
  scripts: { start: "expo start", check: "tsc" },
  dependencies: { expo: "54.0.0", react: "19.0.0", "react-native": "0.81.0" },
  devDependencies: { "@vitejs/plugin-react": "5.0.0" },
};

// The kits for one kind of product each; Other code takes any project
// (tested below).
const specific = allKits.filter((kit) => !kit.fallback);

const recognisedBy = (folder: string) =>
  specific.filter((kit) => kit.detect(folder) !== null).map((kit) => kit.id);

test("each kit recognises its own kind and no other", () => {
  assert.deepEqual(recognisedBy(folderWith(web)), ["react-web-app"]);
  assert.deepEqual(recognisedBy(folderWith(server)), ["nestjs-backend"]);
  // SvelteKit uses Vite too, but no React: only its own kit knows it.
  assert.deepEqual(recognisedBy(folderWith(svelte)), ["sveltekit-app"]);
  // Shared TypeScript code given out as a package, with no framework.
  assert.deepEqual(recognisedBy(folderWith(shared)), ["typescript-package"]);
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
  // A package answers nowhere: it is kept built (tested below).
  for (const kit of specific.filter((one) => one.port !== undefined)) {
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

// A folder with these files in it, each with its text.
function folderWithFiles(files: Record<string, string>): string {
  const folder = mkdtempSync(join(tmpdir(), "code-"));
  for (const [name, text] of Object.entries(files)) {
    const path = join(folder, name);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text);
  }
  return folder;
}

test("other code: any project, with the commands its files tell", () => {
  const python = folderWithFiles({
    "pyproject.toml": "",
    "tests/test_x.py": "",
  });
  assert.deepEqual(otherCode.detect(python)?.commands, { verify: "pytest" });
  assert.deepEqual(
    otherCode.detect(folderWithFiles({ "requirements.txt": "" }))?.commands,
    {},
  );
  assert.deepEqual(
    otherCode.detect(folderWithFiles({ "go.mod": "", "main.go": "" }))
      ?.commands,
    { start: "go run .", verify: "go test ./..." },
  );
  assert.deepEqual(
    otherCode.detect(folderWithFiles({ "go.mod": "" }))?.commands,
    { verify: "go test ./..." },
  );
  assert.deepEqual(
    otherCode.detect(folderWithFiles({ "Cargo.toml": "" }))?.commands,
    { start: "cargo run", verify: "cargo test" },
  );
  assert.deepEqual(
    otherCode.detect(folderWithFiles({ "index.html": "" }))?.commands,
    {},
  );
  const site = otherCode.detect(
    folderWith({
      name: "my-site",
      scripts: { start: "next start", test: "x" },
    }),
  );
  assert.ok(site);
  assert.equal(site.name, "My site");
  assert.deepEqual(site.commands, { start: "npm start", verify: "npm test" });
  assert.deepEqual(
    otherCode.detect(folderWith({ scripts: { dev: "next dev" } }))?.commands,
    { start: "npm run dev" },
  );
  assert.equal(otherCode.detect(folderWith()), null);
  assert.equal(otherCode.create, null);
});

test("other code runs its start command from its button, or not at all", () => {
  const product = productOf(otherCode, {
    commands: { start: "npm  run dev" },
  });
  const [part] = otherCode.partsFor(product);
  assert.ok(part);
  assert.deepEqual(part.run, ["npm", "run", "dev"]);
  assert.equal(part.start, "button");
  assert.ok(partSchema.safeParse(part).success);
  assert.deepEqual(otherCode.partsFor({ ...product, commands: {} }), []);
});

test("a project's own apps win over the project as a whole", () => {
  const monorepo = folderWithFiles({
    "package.json": JSON.stringify({ name: "everything" }),
    "apps/shop/package.json": JSON.stringify(web),
    "tools/script/go.mod": "",
  });
  assert.deepEqual(
    detectProducts(monorepo, allKits).map((c) => [c.id, c.kind]),
    [
      ["shop", "react-web-app"],
      ["script", "other-code"],
    ],
  );
  const alone = folderWithFiles({ "pyproject.toml": "" });
  assert.deepEqual(
    detectProducts(alone, allKits).map((c) => c.kind),
    ["other-code"],
  );
});

test("the SvelteKit kit runs a site with Vite's server, checks it with svelte-check and makes one with sv", () => {
  assert.deepEqual(sveltekitApp.detect(folderWith(svelte)), {
    name: "My site",
    commands: { start: "npm run dev", verify: "npm run check" },
  });
  const [part] = sveltekitApp.partsFor(
    productOf(sveltekitApp, { port: 5300, about: "Shows." }),
  );
  assert.ok(part);
  assert.deepEqual(part.run, [
    "npm",
    "run",
    "dev",
    "--",
    "--port",
    "5300",
    "--strictPort",
    "--host",
    "127.0.0.1",
  ]);
  assert.deepEqual(part.port, { fixed: 5300 });
  assert.deepEqual(sveltekitApp.create?.(join(tmpdir(), "site"), "Site"), [
    [
      "npx",
      "sv@latest",
      "create",
      "site",
      "--template",
      "minimal",
      "--types",
      "ts",
      "--no-add-ons",
      "--install",
      "npm",
    ],
  ]);
});

test("the SvelteKit kit brings Svelte's MCP server", () => {
  assert.deepEqual(sveltekitApp.mcp, {
    svelte: { type: "stdio", command: "npx", args: ["-y", "@sveltejs/mcp"] },
  });
  assert.deepEqual(reactWebApp.mcp, {});
});

test("a TypeScript package is checked by its build and kept built by its watch script", () => {
  assert.deepEqual(typescriptPackage.detect(folderWith(shared)), {
    name: "Spec",
    commands: { start: "npm run dev", verify: "npm run build" },
  });
  const [watch] = typescriptPackage.partsFor(
    productOf(typescriptPackage, { commands: { start: "npm run dev" } }),
  );
  assert.deepEqual(partSchema.parse(watch).run, ["npm", "run", "dev"]);
  assert.deepEqual(
    typescriptPackage.partsFor(productOf(typescriptPackage)),
    [],
  );
  // Its own check wins; without a build, the compiler checks the types.
  assert.deepEqual(
    typescriptPackage.detect(
      folderWith({ ...shared, scripts: { test: "node --test" } }),
    )?.commands,
    { verify: "npm test" },
  );
  assert.deepEqual(
    typescriptPackage.detect(folderWith({ ...shared, scripts: {} }))?.commands,
    { verify: "npx tsc --noEmit" },
  );
  // Not a package: nothing given out, a framework, or a program to start.
  for (const not of [
    { ...shared, main: undefined, exports: undefined },
    { ...shared, dependencies: { express: "5" } },
    { ...shared, scripts: { start: "node ." } },
  ])
    assert.equal(typescriptPackage.detect(folderWith(not)), null);
});

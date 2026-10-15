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

import {
  addProduct,
  createFactoryFolder,
  defineKit,
  detectProducts,
  findProducts,
  hasFactory,
  idFrom,
  readCompany,
  saveCompany,
  withFreePorts,
} from "../src/index.ts";

// Setting up a factory: what is found in existing code, and the factory
// folder made for a company.

const marked = (kind: string, port: number) =>
  defineKit({
    id: kind,
    name: kind,
    about: "A stand-in kit.",
    kind,
    commands: { start: "npm start" },
    port,
    detect: (folder) =>
      existsSync(join(folder, `${kind}.txt`))
        ? { name: kind, commands: { verify: "npm test" } }
        : null,
  });
const kits = [marked("web", 5173), marked("api", 3000)];

function codeWith(folders: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "code-"));
  for (const [folder, file] of Object.entries(folders)) {
    mkdirSync(join(root, folder), { recursive: true });
    writeFileSync(join(root, folder, file), "");
  }
  return root;
}

test("the products in existing code are found by the kits, each with its own id and port", () => {
  const root = codeWith({
    "apps/Shop Front": "web.txt",
    "apps/Shop Front/nested": "api.txt",
    "apps/help-site": "web.txt",
    "services/shop-front": "api.txt",
    "node_modules/lib": "web.txt",
    ".hidden/tool": "web.txt",
    "a/b/c/d": "web.txt",
  });
  const found = detectProducts(root, kits);
  assert.deepEqual(
    found.map((c) => [c.id, c.kind, c.port, c.folder.slice(root.length + 1)]),
    [
      ["help-site", "web", 5173, "apps/help-site"],
      ["shop-front", "web", 5174, "apps/Shop Front"],
      ["shop-front-2", "api", 3000, "services/shop-front"],
    ],
  );
  assert.deepEqual(found[0]?.commands, { verify: "npm test" });
  assert.deepEqual(detectProducts(join(root, "nowhere"), kits), []);
  assert.equal(idFrom("2nd App_x!"), "nd-app-x");
  assert.equal(idFrom("123"), "app");
  assert.deepEqual(withFreePorts([{ port: 80 }, {}, { port: 80 }]), [
    { port: 80 },
    {},
    { port: 81 },
  ]);
});

test("a new factory folder: the company file, the knowledge base, the history and the ground rules", () => {
  const templates = mkdtempSync(join(tmpdir(), "templates-"));
  mkdirSync(join(templates, "context"));
  writeFileSync(join(templates, "context", "index.md"), "# Knowledge base\n");
  writeFileSync(join(templates, "AGENTS.md"), "# <company>'s factory\n");
  const root = join(mkdtempSync(join(tmpdir(), "factories-")), "acme");
  assert.equal(hasFactory(root), false);
  const company = createFactoryFolder(
    root,
    { name: "Acme", about: "Garden tools." },
    { knowledgeBase: templates, agents: join(templates, "AGENTS.md") },
  );
  assert.equal(company.tracker, "none");
  assert.equal(hasFactory(root), true);
  assert.equal(
    readFileSync(join(root, "AGENTS.md"), "utf8"),
    "# Acme's factory\n",
  );
  for (const file of [
    "context/index.md",
    "runs/README.md",
    "CLAUDE.md",
    ".gitignore",
  ])
    assert.ok(existsSync(join(root, file)), file);
  assert.throws(
    () =>
      createFactoryFolder(
        root,
        { name: "Acme" },
        { knowledgeBase: templates, agents: join(templates, "AGENTS.md") },
      ),
    /There is a factory/,
  );
  saveCompany(root, { ...company, tracker: "jira", kits: ["web"] });
  const read = readCompany(join(root, "factory.json"));
  assert.ok("company" in read);
  assert.equal(read.company.tracker, "jira");

  // A product near the folder keeps a relative path to its code; one far
  // away keeps its whole path.
  const near = join(root, "..", "shop");
  addProduct(root, {
    id: "shop",
    name: "Shop",
    kind: "web",
    folder: near,
    about: "",
    users: [],
    commands: {},
    dependsOn: [],
    port: 5173,
  });
  const found = findProducts(root);
  assert.deepEqual(found.problems, []);
  assert.equal(found.products[0]?.folder, near);
  assert.equal(found.products[0].code, "../../../shop");
  assert.match(
    readFileSync(join(root, "products", "shop", "BLUEPRINT.md"), "utf8"),
    /# Shop blueprint/,
  );
  addProduct(root, {
    id: "far",
    name: "Far",
    kind: "web",
    folder: "/somewhere/else/far",
    about: "",
    users: [],
    commands: {},
    dependsOn: [],
  });
  assert.equal(findProducts(root).products[0]?.code, "/somewhere/else/far");
  assert.throws(
    () =>
      addProduct(root, {
        id: "shop",
        name: "Shop",
        kind: "web",
        folder: near,
        about: "",
        users: [],
        commands: {},
        dependsOn: [],
      }),
    /There is a product "shop"/,
  );
});

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import {
  addProduct,
  createFactoryFolder,
  defineKit,
  detectProducts,
  findFactory,
  findProducts,
  hasFactory,
  idFrom,
  pointToFactory,
  projectOf,
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
  for (const file of ["runs/README.md", ".gitignore"])
    assert.ok(existsSync(join(root, file)), file);
  // The knowledge base goes into the project's docs/, never over its own docs.
  assert.equal(
    readFileSync(join(root, "..", "docs", "index.md"), "utf8"),
    "# Knowledge base\n",
  );
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

  // A product is described next to its code and listed from the project's
  // root; one outside the project is listed with its whole path.
  const shop = join(root, "..", "apps", "shop");
  const product = {
    id: "shop",
    name: "Shop",
    kind: "web",
    folder: shop,
    about: "",
    users: [],
    commands: {},
    dependsOn: [],
  };
  addProduct(root, { ...product, port: 5173 });
  const found = findProducts(root);
  assert.deepEqual(found.problems, []);
  assert.equal(found.products[0]?.folder, resolve(shop));
  assert.equal(found.products[0].home, resolve(shop));
  assert.match(
    readFileSync(join(shop, "BLUEPRINT.md"), "utf8"),
    /# Shop blueprint/,
  );
  const far = mkdtempSync(join(tmpdir(), "far-"));
  addProduct(root, { ...product, id: "far", name: "Far", folder: far });
  const listed = readCompany(join(root, "factory.json"));
  assert.ok("company" in listed);
  assert.deepEqual(listed.company.products, ["apps/shop", far]);
  assert.equal(findProducts(root).products[1]?.folder, far);
  assert.throws(() => addProduct(root, product), /There is a product in/);

  // A product the list names but that has no description is said plainly.
  saveCompany(root, { ...listed.company, products: ["apps/shop", "gone"] });
  assert.match(
    findProducts(root).problems.join(),
    /gone: there is no product\.json/,
  );
});

test("a project's factory: found from anywhere inside the project, and pointed to by its rules", () => {
  const project = mkdtempSync(join(tmpdir(), "project-"));
  const inside = join(project, "shop", "src");
  mkdirSync(inside, { recursive: true });
  assert.equal(findFactory(inside), null);
  // Without git, the project is where the command runs; with git, its top.
  assert.equal(projectOf(inside), inside);
  mkdirSync(join(project, ".git"));
  assert.equal(projectOf(inside), project);

  writeFileSync(join(project, "factory.json"), "{}");
  mkdirSync(join(project, "factory"));
  writeFileSync(join(project, "factory", "factory.json"), "{}");
  assert.equal(findFactory(inside), join(project, "factory"));

  // No rules yet: they are made. Rules of its own: the pointer goes at
  // the end, once.
  pointToFactory(project);
  assert.match(
    readFileSync(join(project, "AGENTS.md"), "utf8"),
    /^## Software factory\n[\s\S]*`factory\/AGENTS.md`/,
  );
  assert.equal(
    readFileSync(join(project, "CLAUDE.md"), "utf8"),
    "@AGENTS.md\n@factory/AGENTS.md\n",
  );
  const other = mkdtempSync(join(tmpdir(), "project-"));
  writeFileSync(join(other, "AGENTS.md"), "# Our rules\n\n- Be kind.\n");
  writeFileSync(join(other, "CLAUDE.md"), "@AGENTS.md\n");
  pointToFactory(other);
  pointToFactory(other);
  const rules = readFileSync(join(other, "AGENTS.md"), "utf8");
  assert.match(rules, /^# Our rules\n\n- Be kind\.\n\n## Software factory\n/);
  assert.equal(rules.split("## Software factory").length, 2);
  assert.equal(
    readFileSync(join(other, "CLAUDE.md"), "utf8"),
    "@AGENTS.md\n\n@factory/AGENTS.md\n",
  );
});

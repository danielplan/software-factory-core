import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
  CORE_VERSION,
  createFactoryFolder,
  defineKit,
  releaseOf,
} from "@software-factory/core";
import { GIT, templateFolder } from "@software-factory/knowledge-base";
import { templatesFolder } from "@software-factory/skills";

import { addProjectChecks } from "../src/project-checks.ts";
import {
  checkFormatHere,
  type Shell,
  verifyHere,
  verifyPushed,
} from "../src/verify-command.ts";
import { writeCompany } from "../src/write-factory.ts";

// A new project gets its own checks at its top, as a company's factory has
// them: a package.json that checks every product and the knowledge base,
// and git hooks that run the factory's checks of what changed.

const templates = {
  knowledgeBase: templateFolder,
  agents: join(templatesFolder, "AGENTS.md"),
};

test("a new project gets a package.json with its checks, the core pinned, and git hooks", () => {
  const project = mkdtempSync(join(tmpdir(), "fresh-"));
  writeCompany({ name: "Bike shop", about: "" }, project, templates);
  const data = JSON.parse(
    readFileSync(join(project, "package.json"), "utf8"),
  ) as {
    name: string;
    private: boolean;
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  assert.equal(data.name, "bike-shop");
  assert.equal(data.private, true);
  assert.deepEqual(data.scripts, {
    prepare: "lefthook install",
    verify: "software-factory verify && npm run check:docs",
    "check:docs": "software-factory check-docs",
  });
  assert.equal(
    data.devDependencies["software-factory"],
    releaseOf(CORE_VERSION),
  );
  assert.ok(data.devDependencies.lefthook);
  const hooks = readFileSync(join(project, "lefthook.yml"), "utf8");
  assert.match(hooks, /software-factory check-format \{staged_files\}/);
  assert.match(hooks, /software-factory check-docs/);
  assert.match(hooks, /software-factory verify --pushed\n {6}use_stdin: true/);
  assert.equal(
    readFileSync(join(project, ".gitignore"), "utf8"),
    "node_modules/\n",
  );
});

test("a project with a package.json or git hooks of its own keeps them", () => {
  const own = mkdtempSync(join(tmpdir(), "own-"));
  writeFileSync(join(own, "package.json"), '{ "name": "mine" }\n');
  assert.equal(addProjectChecks(own, "Mine"), false);
  assert.equal(
    readFileSync(join(own, "package.json"), "utf8"),
    '{ "name": "mine" }\n',
  );
  assert.ok(!existsSync(join(own, "lefthook.yml")));

  const hooked = mkdtempSync(join(tmpdir(), "hooked-"));
  mkdirSync(join(hooked, ".husky"));
  writeFileSync(join(hooked, ".gitignore"), "dist");
  assert.equal(addProjectChecks(hooked, "Hooked"), true);
  const data = JSON.parse(
    readFileSync(join(hooked, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  assert.equal(data.scripts.prepare, undefined);
  assert.ok(!existsSync(join(hooked, "lefthook.yml")));
  assert.equal(
    readFileSync(join(hooked, ".gitignore"), "utf8"),
    "dist\nnode_modules/\n",
  );
});

const kit = defineKit({
  id: "web",
  name: "Web",
  about: "A stand-in.",
  kind: "web",
  commands: { verify: "npm run kit-verify" },
});

function factoryWithProducts() {
  const project = mkdtempSync(join(tmpdir(), "checked-"));
  const root = join(project, "factory");
  createFactoryFolder(root, { name: "Shop" }, templates);
  const product = (id: string, commands: Record<string, string>) => {
    const folder = join(project, id);
    mkdirSync(folder);
    addProduct(root, { id, name: id, kind: "web", folder, commands });
    return folder;
  };
  const app = product("app", { verify: "npm run verify" });
  const server = product("server", {});
  const plain = product("plain", {});
  writeFileSync(
    join(app, "package.json"),
    JSON.stringify({ scripts: { "format:check": "prettier --check ." } }),
  );
  writeFileSync(join(server, "package.json"), "not json");
  return { project, app, server, plain };
}

function said(
  check: (out: (line: string) => void, shell: Shell) => number,
  fails: string[] = [],
) {
  const ran: string[] = [];
  const lines: string[] = [];
  const shell = (command: string, cwd: string) => {
    ran.push(`${cwd.split(/[\\/]/).pop() ?? ""}: ${command}`);
    return !fails.includes(command);
  };
  const code = check((line) => lines.push(line), shell);
  return { code, ran, said: lines.join("\n") };
}

test("verify runs each product's verify command, or only those of the products the files are in", () => {
  const { project, app } = factoryWithProducts();
  const all = said((out, shell) => verifyHere(project, [], [kit], out, shell));
  assert.equal(all.code, 0);
  // The product's own command, else its kit's.
  assert.deepEqual(all.ran, [
    "app: npm run verify",
    "server: npm run kit-verify",
    "plain: npm run kit-verify",
  ]);
  const some = said((out, shell) =>
    verifyHere(project, ["app/src/main.ts", "docs/index.md"], [], out, shell),
  );
  assert.deepEqual(some.ran, ["app: npm run verify"]);
  const none = said((out, shell) =>
    verifyHere(project, ["server/x.ts"], [], out, shell),
  );
  assert.equal(none.code, 0);
  assert.match(none.said, /server: no verify command/);
  const failed = said(
    (out, shell) => verifyHere(app, [], [kit], out, shell),
    ["npm run verify"],
  );
  assert.equal(failed.code, 1);
  assert.match(
    failed.said,
    /These checks failed:\n {2}✗ app: npm run verify \(in \.\)/,
  );
  const outside = said((out, shell) =>
    verifyHere(mkdtempSync(join(tmpdir(), "none-")), [], [kit], out, shell),
  );
  assert.equal(outside.code, 1);
  assert.match(outside.said, /no factory here/);
});

test("check-format runs the format check of each product a file is in, when it has one", () => {
  const { project } = factoryWithProducts();
  const staged = said((out, shell) =>
    checkFormatHere(
      project,
      ["app/a.ts", "server/b.ts", "plain/c"],
      out,
      shell,
    ),
  );
  assert.equal(staged.code, 0);
  assert.deepEqual(staged.ran, ["app: npm run format:check"]);
});

test("the checks run for real, in the product's folder, and a failing one fails the command", () => {
  const { project, app } = factoryWithProducts();
  const file = join(app, "product.json");
  const described = JSON.parse(readFileSync(file, "utf8")) as {
    commands: Record<string, string>;
  };
  // Fails only where it runs in the product's folder (it has package.json).
  described.commands.verify = `node -e "process.exit(require('fs').existsSync('package.json') ? 3 : 0)"`;
  writeFileSync(file, JSON.stringify(described));
  const lines: string[] = [];
  assert.equal(
    verifyHere(project, ["app/x"], [], (line) => lines.push(line)),
    1,
  );
  assert.match(lines.join("\n"), /✗ app:/);
});

test("before a push, verify checks only the products the commits no remote has yet change", () => {
  const { project } = factoryWithProducts();
  const git = (...args: string[]) =>
    execFileSync(GIT, args, { cwd: project, encoding: "utf8" }).trim();
  const remote = mkdtempSync(join(tmpdir(), "remote-"));
  execFileSync(GIT, ["init", "-q", "--bare", remote]);
  git("init", "-q", "-b", "main");
  git("config", "user.email", "factory@example.com");
  git("config", "user.name", "Factory");
  git("add", "-A");
  git("commit", "-qm", "The products");
  git("remote", "add", "origin", remote);
  git("push", "-q", "origin", "main");
  git("switch", "-qc", "change");
  writeFileSync(join(project, "app", "page.ts"), "export {};\n");
  git("add", "-A");
  git("commit", "-qm", "A page");
  const sha = git("rev-parse", "HEAD");
  const zeros = "0".repeat(40);
  const pushed = said((out, shell) =>
    verifyPushed(
      project,
      `refs/heads/change ${sha} refs/heads/change ${zeros}\n`,
      [kit],
      out,
      shell,
    ),
  );
  assert.equal(pushed.code, 0);
  assert.deepEqual(pushed.ran, ["app: npm run verify"]);
  // A branch deleted, or nothing pushed: nothing to check.
  const deleted = said((out, shell) =>
    verifyPushed(
      project,
      `(delete) ${zeros} refs/heads/old ${sha}\n`,
      [kit],
      out,
      shell,
    ),
  );
  assert.deepEqual([deleted.code, deleted.ran], [0, []]);
});

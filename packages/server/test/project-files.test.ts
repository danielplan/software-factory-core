import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

import {
  addProduct,
  CORE_VERSION,
  createFactoryFolder,
  defineKit,
  releaseOf,
  saveCompany,
} from "@software-factory/core";
import { GIT, templateFolder } from "@software-factory/knowledge-base";
import { templatesFolder } from "@software-factory/skills";

import { checkRecordsHere } from "../src/check-command.ts";
import {
  CORE_HOOKS,
  CORE_SCRIPTS,
  editedProjectFiles,
  HOOKS_FILE,
  TEAM_HOOKS,
  writeProjectFiles,
} from "../src/project-files.ts";
import { companyOf } from "../src/upgrade/migrations.ts";
import { upgradeFactory } from "../src/upgrade/upgrade.ts";
import {
  checkFormatHere,
  type Shell,
  verifyHere,
  verifyPushed,
} from "../src/verify-command.ts";
import { writeCompany } from "../src/write-factory.ts";

// The project files the core owns, written the same way in every factory:
// lefthook.yml whole, taking in the team's own factory/hooks.yml, and the
// core's keys in package.json; every other key is the team's. Then the
// factory's own checks they run.

const templates = {
  knowledgeBase: templateFolder,
  agents: join(templatesFolder, "AGENTS.md"),
};
const lefthook = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "node_modules",
  ".bin",
  "lefthook",
);

type PackageJson = {
  name?: string;
  private?: boolean;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};
const packageOf = (project: string) =>
  JSON.parse(
    readFileSync(join(project, "package.json"), "utf8"),
  ) as PackageJson;

test("a new project gets the core's package.json, git hooks and a place for the team's own", () => {
  const project = mkdtempSync(join(tmpdir(), "fresh-"));
  const said: string[] = [];
  writeCompany({ name: "Bike shop", about: "" }, project, templates, (line) =>
    said.push(line),
  );
  const data = packageOf(project);
  assert.equal(data.name, "bike-shop");
  assert.equal(data.private, true);
  assert.deepEqual(data.scripts, CORE_SCRIPTS);
  assert.equal(
    data.devDependencies["software-factory"],
    releaseOf(CORE_VERSION),
  );
  assert.ok(data.devDependencies.lefthook);
  assert.equal(readFileSync(join(project, HOOKS_FILE), "utf8"), CORE_HOOKS);
  assert.match(CORE_HOOKS, /software-factory check-format \{staged_files\}/);
  assert.match(
    CORE_HOOKS,
    /software-factory verify --pushed\n {6}use_stdin: true/,
  );
  assert.match(CORE_HOOKS, /extends:\n {2}- factory\/hooks\.yml\n$/);
  assert.match(
    readFileSync(join(project, TEAM_HOOKS), "utf8"),
    /^# The team's own git hooks/,
  );
  assert.equal(
    readFileSync(join(project, ".gitignore"), "utf8"),
    "node_modules/\n",
  );
  assert.match(said.join("\n"), /Made package\.json/);
  assert.deepEqual(editedProjectFiles(project), []);
});

test("lefthook takes in the team's own hooks from factory/hooks.yml", () => {
  const project = mkdtempSync(join(tmpdir(), "hooks-"));
  execFileSync(GIT, ["init", "-q"], { cwd: project });
  mkdirSync(join(project, "factory"));
  writeProjectFiles(project, "Shop", CORE_VERSION);
  const dump = () =>
    execFileSync(lefthook, ["dump"], { cwd: project, encoding: "utf8" });
  // The template has only comments: the core's hooks alone.
  assert.match(dump(), /name: verify/);
  writeFileSync(
    join(project, TEAM_HOOKS),
    "pre-commit:\n  jobs:\n    - name: our check\n      run: npm run ours\n",
  );
  const merged = dump();
  assert.match(merged, /name: format/);
  assert.match(merged, /name: our check/);
  // The team's file is never written again.
  writeProjectFiles(project, "Shop", CORE_VERSION);
  assert.match(readFileSync(join(project, TEAM_HOOKS), "utf8"), /our check/);
});

test("an existing project's hooks and scripts: the core's are written again, the rest is kept, the old ones said", async () => {
  const project = mkdtempSync(join(tmpdir(), "company-"));
  const root = join(project, "factory");
  createFactoryFolder(root, { name: "Boats" }, templates);
  // A factory from before 0.14.1, with its own checks at the top.
  saveCompany(root, { ...companyOf(root), core: "0.14.0" });
  const own = {
    name: "boats-checks",
    private: true,
    type: "module",
    scripts: {
      prepare: "lefthook install",
      "check:docs": "npm run check:links && npm run check:pages",
      "check:links": "remark . --frail",
      setup: "node scripts/setup.mjs",
      test: 'node --test "scripts/**/*.test.mjs"',
    },
    devDependencies: { lefthook: "2.0.0", "remark-cli": "12.0.1" },
  };
  writeFileSync(
    join(project, "package.json"),
    `${JSON.stringify(own, null, 2)}\n`,
  );
  const hooks =
    "pre-commit:\n  jobs:\n    - name: changes row\n      run: node scripts/hooks/changes-row.mjs\n";
  writeFileSync(join(project, HOOKS_FILE), hooks);

  const upgraded = await upgradeFactory({
    project,
    root,
    kits: [],
    extensions: [],
  });
  assert.equal(readFileSync(join(project, HOOKS_FILE), "utf8"), CORE_HOOKS);
  const kept = join(root, "hooks-before-0.14.1.yml");
  assert.equal(readFileSync(kept, "utf8"), hooks);
  assert.match(
    readFileSync(join(project, TEAM_HOOKS), "utf8"),
    /factory\/hooks-before-0\.14\.1\.yml: bring over/,
  );
  const data = packageOf(project);
  assert.deepEqual(data.scripts, {
    ...own.scripts,
    ...CORE_SCRIPTS,
  });
  assert.equal(data.devDependencies["remark-cli"], "12.0.1");
  assert.equal(data.devDependencies.lefthook, "2.2.1");
  assert.equal(
    data.devDependencies["software-factory"],
    releaseOf(CORE_VERSION),
  );
  const left = upgraded.left.join("\n");
  assert.match(
    left,
    /lefthook\.yml is kept as factory\/hooks-before-0\.14\.1\.yml/,
  );
  assert.match(
    left,
    /replaced "check:docs" \(it was "npm run check:links && npm run check:pages"\)/,
  );
  assert.ok(!left.includes('"prepare"'));
  assert.deepEqual(editedProjectFiles(project), []);

  // Changed by hand, the check says so; the next upgrade writes them again.
  writeFileSync(join(project, HOOKS_FILE), `${CORE_HOOKS}# ours\n`);
  writeFileSync(
    join(project, "package.json"),
    `${JSON.stringify({ ...data, scripts: { ...data.scripts, verify: "echo ok" } }, null, 2)}\n`,
  );
  const lines: string[] = [];
  assert.equal(
    checkRecordsHere(project, undefined, (line) => lines.push(line)),
    1,
  );
  assert.match(
    lines.join("\n"),
    /lefthook\.yml is not the one the core writes[^\n]*factory\/hooks\.yml/,
  );
  assert.match(lines.join("\n"), /the script "verify" is the core's/);
  const again = await upgradeFactory({
    project,
    root,
    kits: [],
    extensions: [],
  });
  assert.match(again.left.join("\n"), /replaced "verify" \(it was "echo ok"\)/);
  assert.deepEqual(editedProjectFiles(project), []);
});

test("a package.json that cannot be read is said, not taken for the core's", () => {
  const project = mkdtempSync(join(tmpdir(), "broken-"));
  writeFileSync(join(project, "package.json"), "{ not json");
  assert.deepEqual(editedProjectFiles(project), [
    "package.json cannot be read as JSON.",
  ]);
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

test("the core's prepare script finishes where the project is installed without git, as on a server", () => {
  const server = mkdtempSync(join(tmpdir(), "server-"));
  const { prepare } = CORE_SCRIPTS;
  assert.ok(prepare);
  // No git copy and no lefthook installed: it does nothing, and npm install goes on
  const result = spawnSync("/bin/sh", ["-c", prepare], {
    cwd: server,
    env: {
      PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
      GIT_CEILING_DIRECTORIES: tmpdir(),
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
});

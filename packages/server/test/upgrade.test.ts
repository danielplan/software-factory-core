import assert from "node:assert/strict";
import {
  cpSync,
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
  compareVersions,
  CORE_VERSION,
  readCompany,
} from "@software-factory/core";
import { allKits } from "@software-factory/kits";
import { templateFolder } from "@software-factory/knowledge-base";

import { githubAddOn } from "../src/add-ons/github/index.ts";
import { jiraAddOn } from "../src/add-ons/jira/index.ts";
import { upgradeCommand } from "../src/upgrade/command.ts";
import { MIGRATIONS } from "../src/upgrade/migrations.ts";
import { upgradeFactory } from "../src/upgrade/upgrade.ts";

// Upgrading a company's factory to the core it runs on: the migrations of
// every release since its version, what the factory owns refreshed, the new
// version written, and the checks.

const extensions = [githubAddOn(), jiraAddOn()].map((a) => a.extension);
const write = (file: string, text: string) => {
  writeFileSync(file, text);
};

// A factory as one was before it said its version: a SvelteKit app
// described as other code, Jira on beside GitHub, no word on the cards.
function oldFactory(kindLine = "- **Kind:** other-code (SvelteKit app).") {
  const project = mkdtempSync(join(tmpdir(), "upgrade-"));
  const root = join(project, "factory");
  mkdirSync(join(project, "web"));
  write(
    join(project, "web", "package.json"),
    JSON.stringify({
      name: "web",
      scripts: { dev: "vite dev", check: "svelte-check" },
      devDependencies: { "@sveltejs/kit": "3.0.0" },
    }),
  );
  mkdirSync(join(root, "products", "web"), { recursive: true });
  cpSync(join(templateFolder, "context"), join(root, "context"), {
    recursive: true,
  });
  write(
    join(root, "factory.json"),
    JSON.stringify({ name: "Acme", tracker: "github", kits: ["other-code"] }),
  );
  write(
    join(root, "products", "web", "product.json"),
    JSON.stringify({
      id: "web",
      name: "Web",
      kind: "other-code",
      code: "../../../web",
      commands: { start: "npm run dev" },
    }),
  );
  write(
    join(root, "products", "web", "BLUEPRINT.md"),
    `# Web\n\n${kindLine}\n`,
  );
  write(
    join(root, "AGENTS.md"),
    "Start with the `factory` skill: plan → build → `update-context`.\n",
  );
  return { project, root };
}

test("an old factory is brought to the core's version, step by step", async () => {
  const { project, root } = oldFactory();
  const result = await upgradeFactory({
    project,
    root,
    kits: allKits,
    extensions,
  });
  assert.equal(result.from, "0.1.0");
  assert.equal(result.to, CORE_VERSION);
  assert.deepEqual(result.left, []);
  const read = readCompany(join(root, "factory.json"));
  assert.ok(!("problem" in read));
  assert.equal(read.company.core, CORE_VERSION);
  assert.deepEqual(read.company.kits, ["sveltekit-app"]);
  assert.deepEqual(read.company.without, ["jira"]);
  const product = JSON.parse(
    readFileSync(join(root, "products", "web", "product.json"), "utf8"),
  ) as { kind: string };
  assert.equal(product.kind, "sveltekit-app");
  assert.match(
    readFileSync(join(root, "products", "web", "BLUEPRINT.md"), "utf8"),
    /- \*\*Kind:\*\* sveltekit-app\.\n/,
  );
  assert.match(
    readFileSync(join(root, "AGENTS.md"), "utf8"),
    /`update-context`\. When the factory is connected to a board, work comes from its cards/,
  );
  assert.ok(existsSync(join(project, ".claude", "skills", "plan", "SKILL.md")));
  assert.match(
    readFileSync(join(project, ".mcp.json"), "utf8"),
    /sveltejs\/mcp/,
  );
  assert.ok(
    result.done.some((line) =>
      line.startsWith("Web is now a SvelteKit web app"),
    ),
  );
  // Again: nothing more to migrate; what the factory owns is refreshed.
  const again = await upgradeFactory({
    project,
    root,
    kits: allKits,
    extensions,
  });
  assert.equal(again.from, CORE_VERSION);
  assert.deepEqual(again.done, ["Refreshed the method's skills (14 folders)."]);
});

test("what a migration cannot do alone is left to the owner, and said", async () => {
  const { project, root } = oldFactory("Its kind is written elsewhere.");
  write(join(root, "AGENTS.md"), "Our own rules.\n");
  const lines: string[] = [];
  const code = await upgradeCommand(
    project,
    { kits: allKits, extensions },
    (line) => lines.push(line),
  );
  assert.equal(code, 0);
  const said = lines.join("\n");
  assert.match(said, /^Upgraded the factory from 0\.1\.0 to /);
  assert.match(
    said,
    /Needs you:\n- Say in products\/web\/BLUEPRINT\.md that its kind is sveltekit-app\.\n- Add to factory\/AGENTS\.md: When the factory/,
  );
  assert.match(said, /Review the changes \(git diff\), then commit them\.$/);
  const lines2: string[] = [];
  assert.equal(
    await upgradeCommand(
      mkdtempSync(join(tmpdir(), "none-")),
      { kits: allKits, extensions },
      (line) => lines2.push(line),
    ),
    1,
  );
  assert.deepEqual(lines2, ["There is no factory here: run it in a project."]);
});

test("every migration belongs to a release up to this core's, in order", () => {
  let last = "0.0.0";
  for (const migration of MIGRATIONS) {
    assert.ok(
      compareVersions(migration.version, CORE_VERSION) <= 0,
      migration.about,
    );
    assert.ok(compareVersions(migration.version, last) >= 0, migration.about);
    last = migration.version;
  }
  assert.equal(compareVersions("0.10.0", "0.9.1") > 0, true);
});

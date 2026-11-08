import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { GIT } from "@software-factory/knowledge-base";

import { projectFacts } from "../src/coach/project-facts.ts";

// What the setup coach is told about an existing project before it reads
// anything: its history from git, and the documentation already in it.

function git(folder: string, ...args: string[]): void {
  const run = spawnSync(GIT, args, { cwd: folder, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
}

test("the coach hears a project's history and the documentation already in it", () => {
  const folder = mkdtempSync(join(tmpdir(), "facts-"));
  mkdirSync(join(folder, "docs"));
  mkdirSync(join(folder, "node_modules", "lib"), { recursive: true });
  mkdirSync(join(folder, ".github"));
  writeFileSync(join(folder, "README.md"), "Intro\n\n# Acme shop\n");
  writeFileSync(join(folder, "docs", "plan.md"), "# The plan\n");
  writeFileSync(join(folder, "docs", "notes.mdx"), "no heading\n");
  writeFileSync(join(folder, "node_modules", "lib", "README.md"), "# Lib\n");
  writeFileSync(join(folder, ".github", "guide.md"), "# Hidden\n");
  git(folder, "init", "-q");
  git(folder, "config", "user.email", "owner@acme.test");
  git(folder, "config", "user.name", "Owner");
  git(folder, "add", ".");
  git(folder, "commit", "-q", "-m", "The shop opens");

  const facts = projectFacts(folder);
  assert.match(
    facts,
    /^Its history: 1 commits from \d{4}-\d\d-\d\d to \d{4}-\d\d-\d\d, by 1 person\. The latest:\n- \d{4}-\d\d-\d\d The shop opens\n/,
  );
  assert.match(
    facts,
    /Its own documentation \(read it first; link to it, never write it again\):\n- README\.md: Acme shop\n- docs\/notes\.mdx\n- docs\/plan\.md: The plan$/,
  );
  assert.doesNotMatch(facts, /Lib|Hidden/);
});

test("a project without git or documentation says so", () => {
  const folder = mkdtempSync(join(tmpdir(), "facts-"));
  writeFileSync(join(folder, "app.js"), "");
  assert.equal(
    projectFacts(folder),
    "Its history: none (no git, or no commits yet).\n\nIts own documentation: none.",
  );
});

test("a long list of pages ends with how many more there are", () => {
  const folder = mkdtempSync(join(tmpdir(), "facts-"));
  for (let n = 0; n < 62; n++)
    writeFileSync(join(folder, `page-${String(n).padStart(2, "0")}.md`), "");
  assert.match(projectFacts(folder), /- page-59\.md\n- and 2 more$/);
});

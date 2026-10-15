import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";

import { listSkills, skillsFolder, templatesFolder } from "../src/index.ts";

// The method as a company gets it: every skill named and described, the
// factory skill routing to each. (No company in it: the core's guard,
// packages/core/test/no-company.test.ts, checks every file.)

const LOOP = [
  "plan",
  "build-test-first",
  "review-structure",
  "show-result",
  "update-context",
];

test("every skill has a name, matching its folder, and a description", () => {
  const skills = listSkills();
  assert.deepEqual(
    skills.map((skill) => skill.name),
    ["factory", ...LOOP].sort((a, b) => a.localeCompare(b)),
  );
  for (const skill of skills) {
    assert.equal(basename(dirname(skill.file)), skill.name);
    assert.ok(skill.description.length > 40, `${skill.name}: description`);
  }
});

test("the factory skill links to every other skill", () => {
  const factory = readFileSync(
    join(skillsFolder, "factory", "SKILL.md"),
    "utf8",
  );
  for (const name of LOOP)
    assert.ok(factory.includes(`(../${name}/SKILL.md)`), `links ${name}`);
});

test("a skill without frontmatter has an empty name and description", () => {
  const folder = mkdtempSync(join(tmpdir(), "skills-"));
  mkdirSync(join(folder, "bare"));
  writeFileSync(join(folder, "bare", "SKILL.md"), "Just text.\n");
  assert.deepEqual(listSkills(folder), [
    { name: "", description: "", file: join(folder, "bare", "SKILL.md") },
  ]);
});

test("the AGENTS.md template marks where the company fills in its own", () => {
  const template = readFileSync(join(templatesFolder, "AGENTS.md"), "utf8");
  assert.ok((template.match(/<!-- company: /g) ?? []).length >= 3);
  assert.match(template, /Start with the `factory` skill/);
});

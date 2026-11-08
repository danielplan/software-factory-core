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

import { installSkills } from "../src/install-skills.ts";

// The method's skills, where the coding agents in the project find them.

function skills(): string {
  const from = mkdtempSync(join(tmpdir(), "skills-"));
  for (const name of ["build", "plan"]) {
    mkdirSync(join(from, name));
    writeFileSync(join(from, name, "SKILL.md"), `# ${name} v1\n`);
  }
  return from;
}

const read = (...path: string[]) => readFileSync(join(...path), "utf8");

test("the method's skills go where Claude Code and Codex look, and are kept up to date", () => {
  const from = skills();
  const project = mkdtempSync(join(tmpdir(), "project-"));
  // The project's own skill called plan, for Codex, is left alone.
  mkdirSync(join(project, ".agents", "skills", "plan"), { recursive: true });
  writeFileSync(
    join(project, ".agents", "skills", "plan", "SKILL.md"),
    "mine\n",
  );

  assert.deepEqual(installSkills(project, from), [
    join(".claude", "skills", "build"),
    join(".claude", "skills", "plan"),
    join(".agents", "skills", "build"),
  ]);
  assert.equal(
    read(project, ".claude", "skills", "plan", "SKILL.md"),
    "# plan v1\n",
  );
  assert.equal(
    read(project, ".agents", "skills", "plan", "SKILL.md"),
    "mine\n",
  );
  assert.ok(
    existsSync(
      join(project, ".claude", "skills", "plan", ".from-software-factory"),
    ),
  );

  // The factory's own copies are replaced by newer ones; the project's stays.
  writeFileSync(join(from, "build", "SKILL.md"), "# build v2\n");
  installSkills(project, from);
  assert.equal(
    read(project, ".claude", "skills", "build", "SKILL.md"),
    "# build v2\n",
  );
  assert.equal(
    read(project, ".agents", "skills", "plan", "SKILL.md"),
    "mine\n",
  );
});

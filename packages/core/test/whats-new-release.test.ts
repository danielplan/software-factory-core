import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { whatsNewProblems } from "../../../scripts/whats-new-files.mjs";

const SECTION = "## 0.20.0\n\n- New: **Something.** Words.\n";

test("a release needs a section in every language's file", () => {
  const folder = mkdtempSync(join(tmpdir(), "whats-new-"));
  try {
    assert.equal(whatsNewProblems(folder, "0.20.0").length, 3);
    writeFileSync(join(folder, "WHATS-NEW.md"), SECTION);
    writeFileSync(join(folder, "WHATS-NEW.it.md"), SECTION);
    writeFileSync(
      join(folder, "WHATS-NEW.de.md"),
      "## 0.19.0\n\n- New: **Old.** X.\n",
    );
    assert.deepEqual(whatsNewProblems(folder, "0.20.0"), [
      'WHATS-NEW.de.md has no section "## 0.20.0" with changes.',
    ]);
    writeFileSync(join(folder, "WHATS-NEW.de.md"), SECTION);
    assert.deepEqual(whatsNewProblems(folder, "0.20.0"), []);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("the repository has what's new for the version it is on", async () => {
  const { CORE_VERSION } = await import("../src/version.ts");
  assert.deepEqual(
    whatsNewProblems(resolve(import.meta.dirname, "../../.."), CORE_VERSION),
    [],
  );
});

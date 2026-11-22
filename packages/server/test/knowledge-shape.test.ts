import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { templateFolder } from "@software-factory/knowledge-base";

import { knowledgeReport } from "../src/builder/checks.ts";
import { knowledgeShape } from "../src/upgrade/knowledge-shape.ts";

// The knowledge base keeps its shape: the upgrade puts back the pages of it
// a project lacks, and the builder's checks fail a branch that leaves the
// knowledge base broken or out of shape.

function project(pages: Record<string, string> | "template"): string {
  const folder = mkdtempSync(join(tmpdir(), "shape-"));
  mkdirSync(join(folder, "factory"));
  if (pages === "template")
    cpSync(join(templateFolder, "context"), join(folder, "docs"), {
      recursive: true,
    });
  else
    for (const [page, text] of Object.entries(pages)) {
      mkdirSync(join(folder, "docs", page, ".."), { recursive: true });
      writeFileSync(join(folder, "docs", page), text);
    }
  return folder;
}

const INDEX = "# Acme\n\n**Type:** Index · Answers: where?\n";

test("the upgrade gives a knowledge base the pages of its shape it lacks, and overwrites none", () => {
  const folder = project({ "index.md": INDEX });
  const migrated = knowledgeShape(join(folder, "factory"));
  assert.match(migrated.done[0] ?? "", /docs\/decisions\/index\.md/);
  assert.equal(migrated.left.length, 1);
  assert.ok(
    existsSync(join(folder, "docs", "reference", "lessons", "index.md")),
  );
  // Already in shape, or no docs/ yet: nothing to do.
  assert.deepEqual(knowledgeShape(join(folder, "factory")), {
    done: [],
    left: [],
  });
  const bare = mkdtempSync(join(tmpdir(), "shape-"));
  assert.deepEqual(knowledgeShape(join(bare, "factory")), {
    done: [],
    left: [],
  });
});

test("the builder's checks fail a knowledge base out of shape, and pass one in shape", async () => {
  assert.match(
    await knowledgeReport(project({ "index.md": INDEX })),
    /### The knowledge base \(docs\/\)[\s\S]*docs\/how-to\/index\.md: Missing page/,
  );
  assert.equal(await knowledgeReport(project("template")), "");
  // No knowledge base yet: the upgrade brings it, not this check.
  assert.equal(
    await knowledgeReport(mkdtempSync(join(tmpdir(), "shape-"))),
    "",
  );
});

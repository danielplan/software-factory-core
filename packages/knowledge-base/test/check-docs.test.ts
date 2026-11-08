import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkDocs } from "../src/index.ts";

// The docs check on small made-up repositories: each problem it must find,
// and the template a new company starts with, which must pass.

const TEMPLATE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "template",
);

function repository(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "docs-"));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}

const INDEX = "# Knowledge base\n\n**Type:** Index · Answers: where?\n";
const page = (kind: string, more = "") =>
  `# A page\n\n**Type:** ${kind} · Answers: what?\n\n${more}\n`;

const messages = async (root: string) =>
  (await checkDocs(root)).map((p) => `${p.file}: ${p.message}`);

test("the template a new company starts with passes every check", async () => {
  assert.deepEqual(await checkDocs(TEMPLATE), []);
});

test("a broken link, a missing heading in another page and a missing file are found, with their line", async () => {
  const root = repository({
    "README.md":
      "# Read me\n\nSee [the guide](docs/guide.md#setting-up) and [gone](docs/gone.md).\n",
    "docs/guide.md": "# Guide\n\n## Installing\n",
  });
  const problems = await checkDocs(root);
  assert.equal(problems.length, 2);
  assert.ok(problems.every((p) => p.file === "README.md" && p.line === 3));
  assert.match(problems[0]?.message ?? "", /setting-up/);
  assert.match(problems[1]?.message ?? "", /gone\.md/);
});

test("a path written in backticks that was moved is found; history, placeholders and commands are not checked", async () => {
  const root = repository({
    "shop/package.json": "{}",
    "shop/src/orders/list.ts": "",
    "README.md":
      "# Read me\n\n`shop/src/orders/` and `shop/src/basket/`, `src/<area>/`, `npm run verify`.\n",
    "shop/README.md":
      "# Shop\n\n`src/orders/list.ts` and `src/orders/gone.ts`\n",
    "runs/001-start.md": "# Run\n\n`shop/src/basket/`\n",
    "CHANGELOG.md": "# Changes\n\n`shop/src/basket/`\n",
  });
  assert.deepEqual(await messages(root), [
    "README.md: Path `shop/src/basket/` does not exist",
    "shop/README.md: Path `src/orders/gone.ts` does not exist",
  ]);
});

test("pages outside the sections, wrong or missing type lines and orphans are found in a context folder", async () => {
  const root = repository({
    "context/index.md": `${INDEX}\n[Guide](how-to/guide.md) [Note](note.md) [Misc](misc/page.md) [Ref](reference/facts.md)\n`,
    "context/how-to/guide.md": page("How-to"),
    "context/note.md": page("Reference"),
    "context/misc/page.md": page("Reference"),
    "context/reference/facts.md": page("Explanation"),
    "context/reference/plain.md": "# Plain\n\n**Type:** Reference\n",
    "context/explanation/lonely.md": page("Explanation"),
    "context/sources/2026-01-01-brief.md": "# Brief, as given\n",
  });
  assert.deepEqual(await messages(root), [
    "context/explanation/lonely.md: Orphan page: no other page links to it",
    "context/misc/page.md: Page outside the Diátaxis sections (use tutorials/, how-to/, reference/, explanation/ or decisions/)",
    "context/note.md: Page outside the Diátaxis sections (use tutorials/, how-to/, reference/, explanation/ or decisions/)",
    'context/reference/facts.md: Page in reference/ says "**Type:** Explanation", expected "Reference"',
    'context/reference/plain.md: Type line without "· Answers: <question>"',
    "context/reference/plain.md: Orphan page: no other page links to it",
  ]);
});

test("a decision record needs its name, front matter and MADR headings", async () => {
  const root = repository({
    "company/context/index.md": `${INDEX}\n[Choice](decisions/choice.md)\n`,
    "company/context/decisions/choice.md":
      "---\nstatus: accepted\n---\n\n# A choice\n\n## Considered Options\n",
  });
  assert.deepEqual(await messages(root), [
    "company/context/decisions/choice.md: Decision not named NNNN-title.md",
    'company/context/decisions/choice.md: Decision without "date:" front matter',
    'company/context/decisions/choice.md: Decision without "decision-makers:" front matter',
    'company/context/decisions/choice.md: Decision without "## Context and Problem Statement"',
    'company/context/decisions/choice.md: Decision without "## Decision Outcome"',
  ]);
});

test("pages and blueprints say what is true now: no run-diary headings; Markdown outside context only needs good links", async () => {
  const root = repository({
    "context/index.md": `${INDEX}\n## Orders, run 042\n`,
    "shop/BLUEPRINT.md": "# Shop\n\n## Basket since run 007\n",
    "docs/notes.md": "# Notes, without a type line\n\n## Run 003 notes\n",
  });
  assert.deepEqual(await messages(root), [
    'context/index.md: Run-diary heading: "## Orders, run 042" (link the run instead)',
    'shop/BLUEPRINT.md: Run-diary heading: "## Basket since run 007" (link the run instead)',
  ]);
});

test("installed packages and coverage reports are never looked into", async () => {
  const root = repository({
    "README.md": "# Read me\n",
    "node_modules/x/README.md": "[gone](gone.md)",
    "coverage/report.md": "[gone](gone.md)",
  });
  assert.deepEqual(await checkDocs(root), []);
});

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { topCommand } from "../src/top-commands.ts";

// The commands that answer and end before the server starts: help, the
// knowledge base's checks, and a word that is no command and no folder.

async function said(args: string[], from: string) {
  const lines: string[] = [];
  const code = await topCommand(args, from, (line) => lines.push(line));
  return { code, said: lines.join("\n") };
}

test("help is printed, never taken for a folder; a folder or nothing starts the factory", async () => {
  const here = mkdtempSync(join(tmpdir(), "top-"));
  mkdirSync(join(here, "shop"));
  for (const args of [["help"], ["--help"], ["-h"]]) {
    const { code, said: text } = await said(args, here);
    assert.equal(code, 0);
    assert.match(text, /software-factory check-docs/);
    assert.match(text, /software-factory card depends/);
  }
  const unknown = await said(["hlep"], here);
  assert.equal(unknown.code, 1);
  assert.match(unknown.said, /no command or folder “hlep”/);
  for (const args of [
    [],
    ["shop"],
    ["new", "idea"],
    ["card", "list"],
    ["upgrade"],
    ["--port", "4400"],
  ])
    assert.equal((await said(args, here)).code, null);
});

test("check-docs runs the knowledge base's checks of the project's docs", async () => {
  const outside = await said(
    ["check-docs"],
    mkdtempSync(join(tmpdir(), "none-")),
  );
  assert.equal(outside.code, 1);
  assert.match(outside.said, /no factory here/);

  const project = mkdtempSync(join(tmpdir(), "kb-"));
  mkdirSync(join(project, "factory"), { recursive: true });
  writeFileSync(join(project, "factory", "factory.json"), "{}");
  // A factory from before 0.6.0, not upgraded yet, is told so.
  assert.match(
    (await said(["check-docs"], project)).said,
    /no knowledge base yet/,
  );

  mkdirSync(join(project, "docs", "explanation"), { recursive: true });
  const index =
    "# Docs\n\n**Type:** Index · Answers: where is what?\n\n[Why](explanation/why.md)";
  writeFileSync(
    join(project, "docs", "index.md"),
    `${index} · [missing](nowhere.md)\n`,
  );
  // A page outside the sections fails; a long page only gets a hint.
  writeFileSync(join(project, "docs", "notes.md"), "# Notes\n");
  writeFileSync(
    join(project, "docs", "explanation", "why.md"),
    `# Why\n\n**Type:** Explanation · Answers: why?\n\n${"word ".repeat(1300)}\n`,
  );
  const broken = await said(["check-docs"], project);
  assert.equal(broken.code, 1);
  assert.match(broken.said, /docs\/index\.md/);
  assert.match(
    broken.said,
    /docs\/notes\.md: Page outside the Diátaxis sections/,
  );
  assert.match(
    broken.said,
    /Hint: docs\/explanation\/why\.md: Long page \(13\d\d words\)/,
  );
  assert.match(broken.said, /problem\(s\) in the knowledge base/);

  // Only the hint left: the check holds.
  writeFileSync(join(project, "docs", "index.md"), `${index}\n`);
  rmSync(join(project, "docs", "notes.md"));
  const fine = await said(["check-docs"], project);
  assert.equal(fine.code, 0);
  assert.match(fine.said, /Hint: /);
});

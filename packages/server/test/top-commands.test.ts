import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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

test("check-docs runs the knowledge base's checks of the project's factory", async () => {
  const outside = await said(
    ["check-docs"],
    mkdtempSync(join(tmpdir(), "none-")),
  );
  assert.equal(outside.code, 1);
  assert.match(outside.said, /no factory here/);

  const project = mkdtempSync(join(tmpdir(), "kb-"));
  mkdirSync(join(project, "factory", "context"), { recursive: true });
  writeFileSync(join(project, "factory", "factory.json"), "{}");
  writeFileSync(
    join(project, "factory", "context", "index.md"),
    "# Context\n\nSee [missing](nowhere.md).\n",
  );
  const broken = await said(["check-docs"], project);
  assert.equal(broken.code, 1);
  assert.match(broken.said, /index\.md/);
  assert.match(broken.said, /problem\(s\) in the knowledge base/);
});

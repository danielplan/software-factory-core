import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { putStartOnDesktop } from "../src/desktop-start.ts";

test("a start on a Mac's desktop: a .command that opens the factory in the project", () => {
  const home = mkdtempSync(join(tmpdir(), "desk-"));
  const file = putStartOnDesktop({
    project: "/work/shop",
    name: "Acme / Co",
    platform: "darwin",
    home,
    bin: "/core/bin/software-factory.ts",
  });
  assert.equal(file, join(home, "Desktop", "Acme  Co factory.command"));
  const text = readFileSync(file, "utf8");
  assert.match(text, /cd "\/work\/shop"/);
  assert.match(text, /node "\/core\/bin\/software-factory\.ts"/);
  assert.equal(statSync(file).mode & 0o111, 0o111);
});

test("on Windows a .cmd; elsewhere a shell script", () => {
  const home = mkdtempSync(join(tmpdir(), "desk-"));
  const cmd = putStartOnDesktop({
    project: "C:\\work\\shop",
    name: "Acme",
    platform: "win32",
    home,
  });
  assert.match(cmd, /Acme factory\.cmd$/);
  assert.match(readFileSync(cmd, "utf8"), /cd \/d "C:\\work\\shop"\r\n/);
  const sh = putStartOnDesktop({
    project: "/w",
    name: "",
    platform: "linux",
    home,
  });
  assert.match(sh, /The factory\.sh$/);
});

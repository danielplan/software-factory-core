import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { CORE_VERSION, releaseOf } from "@software-factory/core";

import { pinCore } from "../src/pin-core.ts";

// The core pinned in the project's package.json, so everyone with the
// project runs the same factory with npx software-factory.

test("the project's package.json pins this core's release, in its own indentation", () => {
  const project = mkdtempSync(join(tmpdir(), "pin-"));
  const file = join(project, "package.json");
  writeFileSync(
    file,
    '{\n\t"name": "shop",\n\t"devDependencies": {\n\t\t"vite": "7"\n\t}\n}\n',
  );
  assert.equal(pinCore(project), true);
  const text = readFileSync(file, "utf8");
  assert.match(text, /^\{\n\t"name": "shop",/);
  const read = JSON.parse(text) as { devDependencies: Record<string, string> };
  assert.deepEqual(read.devDependencies, {
    vite: "7",
    "software-factory": releaseOf(CORE_VERSION),
  });
  assert.match(
    releaseOf("0.3.0"),
    /^github:.+\/software-factory-core#release-0\.3\.0$/,
  );
  // Pinned already: nothing to do. Another version: pinned to it.
  assert.equal(pinCore(project), false);
  assert.equal(pinCore(project, "9.9.9"), true);
  assert.match(readFileSync(file, "utf8"), /#release-9\.9\.9"/);
  // No package.json: left alone.
  assert.equal(pinCore(mkdtempSync(join(tmpdir(), "none-"))), false);
});

test("a project that keeps the core optional has it pinned there, not added again", () => {
  const project = mkdtempSync(join(tmpdir(), "pin-"));
  const file = join(project, "package.json");
  writeFileSync(
    file,
    JSON.stringify({
      name: "shop",
      optionalDependencies: { "software-factory": releaseOf("0.1.0") },
    }),
  );
  assert.equal(pinCore(project), true);
  const read = JSON.parse(readFileSync(file, "utf8")) as Record<
    string,
    Record<string, string> | undefined
  >;
  assert.equal(
    read.optionalDependencies?.["software-factory"],
    releaseOf(CORE_VERSION),
  );
  assert.equal(read.devDependencies, undefined);
  assert.equal(pinCore(project), false);
});

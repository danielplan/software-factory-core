import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { extensionsReport } from "../src/builder/checks.ts";
import { guidesFor, withGuides } from "../src/builder/extension-guides.ts";
import { KOBBLE_EXTENSIONS } from "../src/add-ons/kobble.ts";

// A team's extensions add to the builder's instructions, and a branch that
// changes them is checked before it becomes a pull request.

const available = { extensions: KOBBLE_EXTENSIONS, kits: [] };

function copyWith(description: unknown, company = {}): string {
  const copy = mkdtempSync(join(tmpdir(), "extension-guides-"));
  const factory = join(copy, "factory");
  const folder = join(factory, "extensions", "standup");
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(factory, "factory.json"),
    JSON.stringify({ name: "Beta", extensions: ["standup"], ...company }),
  );
  writeFileSync(join(folder, "extension.json"), JSON.stringify(description));
  writeFileSync(join(folder, "rules.md"), "# Standup rules");
  return copy;
}

const standup = {
  id: "standup",
  name: "Daily standup",
  about: "A short note each morning.",
  guides: [{ agent: "builder", title: "Standup rules", file: "rules.md" }],
};

test("an installed extension's guide for the builder reaches its prompt, before the answer", () => {
  const copy = copyWith(standup);
  const guides = guidesFor(copy, available, "builder");
  assert.deepEqual(
    guides.map((g) => g.title),
    ["Standup rules"],
  );
  assert.deepEqual(guidesFor(copy, available, "explorer"), []);
  const prompt = withGuides("Do it.\n\n## Your answer\n\nEnd.", guides);
  assert.match(prompt, /Standup rules: `.*extensions\/standup\/rules\.md`/);
  assert.ok(
    prompt.indexOf("team's own guides") < prompt.indexOf("## Your answer"),
  );
  assert.equal(withGuides("Do it.", []), "Do it.");
  assert.match(withGuides("Do it.", guides), /^Do it\.\n\n## The team's own/);
});

test("a guide of an extension that is not installed is not read", () => {
  const copy = copyWith(standup, { extensions: [] });
  assert.deepEqual(guidesFor(copy, available, "builder"), []);
});

test("a change to the extensions folder that would not load fails the checks, with why", () => {
  const copy = copyWith({ ...standup, always: true });
  const report = extensionsReport(copy, available, [
    "factory/extensions/standup/extension.json",
  ]);
  assert.match(report, /Your team's extensions: not loaded/);
  assert.match(report, /says "always"/);
  // Nothing in that folder changed, or all of it passes: nothing to say.
  assert.equal(extensionsReport(copy, available, ["README.md"]), "");
  const fine = copyWith(standup);
  assert.equal(
    extensionsReport(fine, available, [
      "factory/extensions/standup/extension.json",
    ]),
    "",
  );
});

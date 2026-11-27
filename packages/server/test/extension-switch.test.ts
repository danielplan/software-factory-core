import assert from "node:assert/strict";
import { test } from "node:test";

import { companySchema, assembleFactory } from "@software-factory/core";

import { githubAddOn } from "../src/extensions/github/index.ts";
import { KOBBLE_EXTENSIONS } from "../src/app/modules.ts";
import { switched, toInstall } from "../src/extension-switch.ts";
import { Refused } from "../src/refused.ts";

// Kobble's own extensions: installed unless removed, one brings what it
// needs, and what others need or what is always needed stays.

const company = companySchema.parse({ name: "Beta" });
// With GitHub, which fills the slot Your code that Factory and Releases use.
const WITH_GITHUB = [...KOBBLE_EXTENSIONS, githubAddOn().extension];
const ids = (list: { id: string }[]) => list.map((e) => e.id);

test("Kobble's own extensions are installed until the company removes one", () => {
  const factory = assembleFactory(company, [], {
    extensions: WITH_GITHUB,
    kits: [],
  });
  assert.deepEqual(factory.problems, []);
  assert.deepEqual(ids(factory.extensions), ids(WITH_GITHUB));
});

test("removing one takes it out, and installing it again brings it back with what it needs", () => {
  const bare = ["testing", "personas", "signals"].reduce(
    (now, id) => switched(now, KOBBLE_EXTENSIONS, id, false),
    company,
  );
  assert.deepEqual(bare.without, ["testing", "personas", "signals"]);
  // Testing needs Personas and Signals, which are not installed: all
  // three come back.
  assert.deepEqual(ids(toInstall(bare, KOBBLE_EXTENSIONS, "testing")), [
    "testing",
    "personas",
    "signals",
  ]);
  assert.deepEqual(
    switched(bare, KOBBLE_EXTENSIONS, "testing", true).without,
    [],
  );
});

test("one that others need is refused, with why; Factory cannot go", () => {
  assert.throws(
    () => switched(company, KOBBLE_EXTENSIONS, "signals", false),
    (error) =>
      error instanceof Refused &&
      error.message === "Personas and Testing need Signals. Remove them first.",
  );
  assert.throws(
    () => switched(company, KOBBLE_EXTENSIONS, "factory", false),
    /Factory is always needed/,
  );
  assert.throws(
    () => switched(company, KOBBLE_EXTENSIONS, "telepathy", true),
    /no extension telepathy/,
  );
});

test("a factory where something is missing does not start, and says why", () => {
  const broken = companySchema.parse({
    name: "Beta",
    without: ["signals", "factory"],
  });
  const factory = assembleFactory(broken, [], {
    extensions: WITH_GITHUB,
    kits: [],
  });
  assert.deepEqual(factory.problems, [
    "Factory is always needed, so it cannot be removed",
    "Explorations needs Factory, which is not installed",
    "Personas needs Signals, which is not installed",
    "Testing needs Signals, which is not installed",
    "Releases needs Factory, which is not installed",
  ]);
});

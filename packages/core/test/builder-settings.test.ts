import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { builderModel, parallelCards } from "../src/index.ts";

function root(text: string) {
  const folder = mkdtempSync(join(tmpdir(), "builder-settings-"));
  mkdirSync(join(folder, "settings"));
  writeFileSync(join(folder, "settings", "factory.env"), text);
  return folder;
}

test("cards at once: from the file, kept between 1 and 5, else 1", () => {
  assert.equal(parallelCards(null), 1);
  assert.equal(parallelCards(root("FACTORY_PARALLEL_CARDS=3\n")), 3);
  assert.equal(parallelCards(root("FACTORY_PARALLEL_CARDS=9\n")), 5);
  assert.equal(parallelCards(root("FACTORY_PARALLEL_CARDS=zero\n")), 1);
});

test("the builder's model: the file's, or none", () => {
  assert.equal(builderModel(null), undefined);
  assert.equal(builderModel(root("FACTORY_BUILDER_MODEL=sonnet\n")), "sonnet");
  assert.equal(builderModel(root("FACTORY_BUILDER_MODEL=\n")), undefined);
});

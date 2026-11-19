import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  builderModel,
  builderSettings,
  groupView,
  moveFormerValues,
  parallelCards,
  saveGroup,
  TEAM_FILE,
} from "../src/index.ts";

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

test("the builder's settings are the team's: team.env first, the old file until they move", () => {
  const folder = root("FACTORY_PARALLEL_CARDS=3\nFACTORY_CLAUDE_MODEL=opus\n");
  assert.equal(builderSettings.file, TEAM_FILE);
  // Before the move, the old file still counts.
  assert.equal(parallelCards(folder), 3);
  writeFileSync(join(folder, "team.env"), "FACTORY_PARALLEL_CARDS=2\n");
  assert.equal(parallelCards(folder), 2);
  assert.equal(groupView(builderSettings, folder).fields[0]?.value, "2");
  // The team's file is in git, even where the project ignores *.env.
  saveGroup(builderSettings, folder, { FACTORY_BUILDER_MODEL: "sonnet" });
  assert.equal(
    readFileSync(join(folder, "team.env"), "utf8"),
    "FACTORY_PARALLEL_CARDS=2\nFACTORY_BUILDER_MODEL=sonnet\n",
  );
  assert.equal(readFileSync(join(folder, ".gitignore"), "utf8"), "!team.env\n");
  // Saving moved the old value out; a person's own settings stay.
  assert.equal(
    readFileSync(join(folder, "settings", "factory.env"), "utf8"),
    "FACTORY_CLAUDE_MODEL=opus\n",
  );
  assert.deepEqual(moveFormerValues(builderSettings, folder), []);
});

test("the old file's team settings move to team.env, unless team.env has its own", () => {
  const folder = root("FACTORY_PARALLEL_CARDS=4\nFACTORY_BUILDER_MODEL=opus\n");
  writeFileSync(join(folder, "team.env"), "FACTORY_BUILDER_MODEL=haiku\n");
  assert.deepEqual(moveFormerValues(builderSettings, folder), [
    "FACTORY_PARALLEL_CARDS",
    "FACTORY_BUILDER_MODEL",
  ]);
  assert.equal(
    readFileSync(join(folder, "team.env"), "utf8"),
    "FACTORY_BUILDER_MODEL=haiku\nFACTORY_PARALLEL_CARDS=4\n",
  );
  assert.equal(
    readFileSync(join(folder, "settings", "factory.env"), "utf8"),
    "",
  );
  // A setting taken back to its default goes from both files.
  writeFileSync(
    join(folder, "settings", "factory.env"),
    "FACTORY_PARALLEL_CARDS=5\n",
  );
  saveGroup(builderSettings, folder, { FACTORY_PARALLEL_CARDS: null });
  assert.equal(parallelCards(folder), 1);
});

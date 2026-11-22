import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import {
  orderStages,
  readTeamExtensions,
  shownView,
} from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";

import { KOBBLE_EXTENSIONS } from "../src/app/modules.ts";

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

// The starter the builder copies for a team's extension must itself pass the
// checks, and show what its guide says: a page, a Home block and a stage.
function loaded() {
  const root = mkdtempSync(join(tmpdir(), "starter-"));
  made.push(root);
  cpSync(
    join(skillsFolder, "factory", "extension-starter"),
    join(root, "extensions", "checklist"),
    { recursive: true },
  );
  return readTeamExtensions(root, KOBBLE_EXTENSIONS);
}

test("the extension starter loads as it is", () => {
  const { extensions, problems } = loaded();
  assert.deepEqual(problems, []);
  const [starter] = extensions;
  assert.deepEqual(
    [starter?.id, starter?.needs, starter?.guides.length],
    ["checklist", ["factory"], 1],
  );
});

test("it brings a page, a Home block and a stage that shows its list", () => {
  const [starter] = loaded().extensions;
  assert.ok(starter);
  assert.deepEqual(
    [starter.brings.pages, starter.brings.blocks, starter.brings.stages],
    [["checklist"], ["checklist-open"], ["checklist"]],
  );
  const page = starter.pages[0];
  assert.ok(page);
  const list = shownView(page).parts[1];
  assert.ok(list?.show === "list" && list.items.length > 0);
  const order = orderStages([...KOBBLE_EXTENSIONS, starter]);
  assert.deepEqual(
    order.order.map((one) => one.id),
    ["signals", "explore", "build", "checklist", "done", "release"],
  );
  assert.equal(order.clash, null);
});

import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { defineExtension, FACTORY_FOLDER } from "@software-factory/core";

import { chosenStages, stagesRoutes, stagesView } from "../src/stages.ts";
import { KOBBLE_EXTENSIONS } from "../src/add-ons/kobble.ts";

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

const url = new URL("http://localhost/");

// Two extensions that both want the place after Build.
const both = [
  ...KOBBLE_EXTENSIONS,
  defineExtension({
    id: "checks",
    name: "Checks",
    about: "Checks.",
    stages: [
      { id: "verify", name: "Verify", after: ["build"], before: ["done"] },
    ],
  }),
  defineExtension({
    id: "approval",
    name: "Approval",
    about: "Approval.",
    stages: [
      { id: "approve", name: "Approve", after: ["build"], before: ["done"] },
    ],
  }),
];

function folder() {
  const root = mkdtempSync(join(tmpdir(), "stages-"));
  made.push(root);
  return root;
}

test("Kobble's own stages follow each other with nothing left open", () => {
  const { order, clash } = stagesView(folder(), KOBBLE_EXTENSIONS);
  assert.deepEqual(
    order.map((stage) => stage.id),
    ["signals", "explore", "build", "done", "release"],
  );
  assert.equal(clash, null);
});

test("a stage of a removed extension leaves the order, and the others hold", () => {
  const without = KOBBLE_EXTENSIONS.filter((e) => e.id !== "explorations");
  const { order, clash } = stagesView(folder(), without);
  assert.deepEqual(
    order.map((stage) => stage.id),
    ["signals", "build", "done", "release"],
  );
  assert.equal(clash, null);
});

test("two stages for one place are a clash until the team's order is saved", async () => {
  const project = folder();
  const root = join(project, FACTORY_FOLDER);
  assert.equal(stagesView(root, both).clash?.first.id, "verify");
  const told: string[] = [];
  const routes = stagesRoutes(
    project,
    () => both,
    () => told.push("changed"),
  );
  const save = routes["POST /api/stages"];
  assert.ok(save);
  const order = [
    "signals",
    "explore",
    "build",
    "approve",
    "verify",
    "done",
    "release",
  ];
  await save({ order }, url);
  assert.deepEqual(told, ["changed"]);
  assert.deepEqual(chosenStages(root), order);
  assert.deepEqual(
    JSON.parse(readFileSync(join(root, "stages.json"), "utf8")),
    { order },
  );
  const settled = stagesView(root, both);
  assert.equal(settled.clash, null);
  assert.deepEqual(
    settled.order.map((stage) => stage.id),
    order,
  );
});

test("only stages there are can be put in order", async () => {
  const project = folder();
  const save = stagesRoutes(
    project,
    () => both,
    () => undefined,
  )["POST /api/stages"];
  assert.ok(save);
  await assert.rejects(
    async () => save({ order: ["build", "nonsense"] }, url),
    /not an order of the stages/,
  );
  await assert.rejects(async () => save({ order: "build" }, url), Error);
  assert.deepEqual(chosenStages(join(project, FACTORY_FOLDER)), []);
});

test("a stages file that is not one is ignored", () => {
  const project = folder();
  const root = join(project, FACTORY_FOLDER);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "stages.json"), "{ nope");
  assert.deepEqual(chosenStages(root), []);
  writeFileSync(join(root, "stages.json"), '{"order": [1]}');
  assert.deepEqual(chosenStages(root), []);
});

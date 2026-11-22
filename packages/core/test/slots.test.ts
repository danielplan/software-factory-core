import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assembleFactory,
  companySchema,
  defineExtension,
  fillsOf,
  slotsOf,
} from "../src/index.ts";

// The slots: the jobs the factory fills once for every extension.

const board = (id: string, more: Record<string, unknown> = {}) =>
  defineExtension({
    id,
    name: id,
    about: id,
    core: true,
    tracker: true,
    ...more,
  });

const github = board("github", { fills: ["code"] });
const jira = board("jira");
const company = (tracker: string) =>
  companySchema.parse({ name: "Beta", tracker });

test("a tracker fills where the tasks are kept, without saying so", () => {
  assert.deepEqual(fillsOf(github), ["code", "tasks"]);
  assert.deepEqual(fillsOf(jira), ["tasks"]);
});

test("each slot has the one filler the company chose, and every extension uses it", () => {
  assert.deepEqual(slotsOf([github, jira], company("jira")), [
    { slot: "code", fillers: ["github"], inUse: "github" },
    { slot: "tasks", fillers: ["github", "jira"], inUse: "jira" },
  ]);
  // Swapping the tracker swaps the filler for all; the code stays where it is.
  assert.deepEqual(
    slotsOf([github, jira], company("github")).map((one) => one.inUse),
    ["github", "github"],
  );
});

test("tasks have no filler in use until a tracker is connected", () => {
  assert.deepEqual(
    slotsOf([github, jira], company("none")).map((one) => one.inUse),
    ["github", null],
  );
});

test("an installed extension that uses a slot nothing fills stops the factory and says why", () => {
  const user = defineExtension({
    id: "notes",
    name: "Notes",
    about: "Notes.",
    slots: ["code"],
  });
  const factory = assembleFactory(
    companySchema.parse({ name: "Beta", extensions: ["notes"] }),
    [],
    { extensions: [jira, user], kits: [] },
  );
  assert.deepEqual(factory.problems, [
    "Notes uses where the code lives, but nothing fills it",
  ]);
  const filled = assembleFactory(
    companySchema.parse({ name: "Beta", extensions: ["notes"] }),
    [],
    { extensions: [github, user], kits: [] },
  );
  assert.deepEqual(filled.problems, []);
});

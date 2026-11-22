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

import { FACTORY_FOLDER } from "@software-factory/core";

import { chosenStages, stagesRoutes, stagesView } from "../src/stages.ts";
import { KOBBLE_EXTENSIONS } from "../src/app/modules.ts";
import { stage } from "./stage.ts";

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

const url = new URL("http://localhost/");

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

// A factory whose two extensions of the team each add a stage with no
// neighbours: the factory cannot tell which comes first.
async function twoStages() {
  const { session, server } = await stage();
  const root = session.createCompany({ name: "Beta", about: "" });
  for (const id of ["first", "second"]) {
    const folder = join(root, "extensions", id);
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      join(folder, "extension.json"),
      JSON.stringify({
        id,
        name: id,
        about: id,
        stages: [{ id: `${id}-stage`, name: id }],
      }),
    );
  }
  session.switchAddOn("voice", true);
  session.switchAddOn("first", true);
  session.switchAddOn("second", true);
  const stages = () => {
    const state = session.state();
    assert.ok(state.mode === "factory");
    return state.stages;
  };
  const save = stagesRoutes(session)["POST /api/stages"];
  assert.ok(save);
  return {
    stages,
    save: async (order: unknown) => save({ order }, url),
    root,
    close: () => {
      session.close();
      server.close();
    },
  };
}

test("two stages for one place are a clash until the team's order is saved", async () => {
  const { stages, save, root, close } = await twoStages();
  try {
    assert.deepEqual(stages().clash, {
      first: "first-stage",
      second: "second-stage",
    });
    await save(["second-stage", "first-stage"]);
    assert.deepEqual(
      JSON.parse(readFileSync(join(root, "stages.json"), "utf8")),
      { order: ["second-stage", "first-stage"] },
    );
    assert.equal(stages().clash, null);
    assert.deepEqual(
      stages().order.map((one) => one.id),
      ["second-stage", "first-stage"],
    );
  } finally {
    close();
  }
});

test("only stages there are can be put in order", async () => {
  const { save, root, close } = await twoStages();
  try {
    await assert.rejects(save(["first-stage", "nonsense"]), /not an order/);
    await assert.rejects(save("first-stage"), /not an order/);
    assert.deepEqual(chosenStages(root), []);
  } finally {
    close();
  }
});

test("a stages file that is not one is ignored", () => {
  const root = join(folder(), FACTORY_FOLDER);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "stages.json"), "{ nope");
  assert.deepEqual(chosenStages(root), []);
  writeFileSync(join(root, "stages.json"), '{"order": [1]}');
  assert.deepEqual(chosenStages(root), []);
});

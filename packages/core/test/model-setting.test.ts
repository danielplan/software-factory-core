import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  checkChanges,
  type Claude,
  type RunOptions,
  withChosenModel,
} from "../src/index.ts";
import { modelSettings } from "../src/agents/model-setting.ts";

const base = {
  cwd: "/copy",
  prompt: "",
  readOnly: false,
  onActivity: () => {},
};

function recorder() {
  const seen: RunOptions[] = [];
  const claude: Claude = {
    run(options) {
      seen.push(options);
      return Promise.resolve({ ok: true, text: "" });
    },
  };
  return { seen, claude };
}

function factoryWith(model?: string) {
  const root = mkdtempSync(join(tmpdir(), "model-"));
  mkdirSync(join(root, "settings"));
  if (model !== undefined)
    writeFileSync(
      join(root, "settings", "factory.env"),
      `FACTORY_CLAUDE_MODEL=${model}\n`,
    );
  return root;
}

test("a run uses the chosen model, read again on every run", async () => {
  const { seen, claude } = recorder();
  let root: string | null = factoryWith("opus");
  const chosen = withChosenModel(claude, () => root);
  await chosen.run(base);
  root = factoryWith("sonnet");
  await chosen.run(base);
  assert.deepEqual(
    seen.map((o) => o.model),
    ["opus", "sonnet"],
  );
});

test("with no model chosen, no factory yet, or a model the run names, nothing is added", async () => {
  const { seen, claude } = recorder();
  await withChosenModel(claude, () => factoryWith()).run(base);
  await withChosenModel(claude, () => null).run(base);
  await withChosenModel(claude, () => factoryWith("opus")).run({
    ...base,
    model: "haiku",
  });
  assert.deepEqual(
    seen.map((o) => o.model),
    [undefined, undefined, "haiku"],
  );
});

test("the model field takes a name or empty, and refuses anything with spaces", () => {
  const ask = (value: string) =>
    checkChanges(modelSettings, { FACTORY_CLAUDE_MODEL: value });
  assert.deepEqual(ask("").refused, {});
  assert.deepEqual(ask("claude-opus-5-5").refused, {});
  assert.notDeepEqual(ask("two words").refused, {});
});

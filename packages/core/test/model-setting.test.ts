import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  checkChanges,
  type Claude,
  makerModel,
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

test("the models are picked from a list: the account's default, Opus, Sonnet or Haiku", () => {
  const ask = (key: string, value: string) =>
    checkChanges(modelSettings, { [key]: value });
  assert.deepEqual(ask("FACTORY_CLAUDE_MODEL", "").refused, {});
  assert.deepEqual(ask("FACTORY_CLAUDE_MODEL", "opus").refused, {});
  assert.deepEqual(ask("FACTORY_MAKER_MODEL", "sonnet").refused, {});
  assert.notDeepEqual(ask("FACTORY_CLAUDE_MODEL", "two words").refused, {});
});

test("prototypes are made with Sonnet unless someone picked another model", () => {
  assert.equal(makerModel(null), "sonnet");
  assert.equal(makerModel(factoryWith()), "sonnet");
  const root = factoryWith("opus");
  writeFileSync(
    join(root, "settings", "factory.env"),
    "FACTORY_CLAUDE_MODEL=opus\nFACTORY_MAKER_MODEL=haiku\n",
  );
  assert.equal(makerModel(root), "haiku");
});

test("the chosen model keeps telling a conversation in the middle of a turn", () => {
  const told: string[] = [];
  const claude: Claude = {
    run: () => Promise.resolve({ ok: true, text: "" }),
    tell: (session, message) => {
      told.push(`${session}: ${message}`);
      return true;
    },
  };
  const chosen = withChosenModel(claude, () => null);
  assert.equal(chosen.tell?.("s1", "also blue"), true);
  assert.deepEqual(told, ["s1: also blue"]);
});

test("the chosen model keeps stopping a conversation's turn", () => {
  const stopped: string[] = [];
  const claude: Claude = {
    run: () => Promise.resolve({ ok: true, text: "" }),
    interrupt: (session) => {
      stopped.push(session);
      return true;
    },
  };
  const chosen = withChosenModel(claude, () => null);
  assert.equal(chosen.interrupt?.("s1"), true);
  assert.deepEqual(stopped, ["s1"]);
});

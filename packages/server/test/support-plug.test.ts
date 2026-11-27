import assert from "node:assert/strict";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import { KOBBLE_EXTENSIONS, KOBBLE_MODULES } from "../src/app/modules.ts";
import { servePlugged } from "../src/app/plug-board.ts";
import type { Cli } from "../src/github-cli.ts";
import type { Host } from "../src/plugs/extension.ts";
import { placeIn } from "../src/kobble/support-tools.ts";
import { plugsGuide } from "../src/kobble/support-plug.ts";
import { Refused } from "../src/refused.ts";

// Extensions never talk to each other; they plug into Sprocket. A removed
// extension takes its hand-offs and its words away, and nothing else breaks.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

// Kobble's own extensions served on the example company's records, with
// these installed; nothing else is reached.
function sprocket(installed: string[]) {
  const root = mkdtempSync(join(tmpdir(), "plug-"));
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  const store = () => new KobbleStore(root);
  const isOn = (id: string) => installed.includes(id);
  const nothing = () => Promise.reject(new Error("Not in this test."));
  const board = servePlugged(
    KOBBLE_MODULES,
    (_module, plug): Host => ({
      project: root,
      factory: root,
      claude: { run: () => Promise.resolve({ ok: true, text: "" }) },
      cli: {} as Cli,
      store,
      records: store,
      changed: () => undefined,
      stateChanged: () => undefined,
      isOn,
      plug,
      slots: { code: {}, tasks: {} },
      cards: () => {
        throw new Refused("No board here.");
      },
      apps: () => [],
      app: nothing,
      browser: nothing,
      available: { kits: [], extensions: KOBBLE_EXTENSIONS },
      watch: () => () => undefined,
      connect: () => undefined,
      installTool: nothing,
    }),
    isOn,
  );
  return { support: { tools: () => ({ plugs: board.support() }) }, store };
}

const handOffs = (installed: string[]) =>
  sprocket(installed)
    .support.tools()
    .plugs.flatMap((plug) => plug.handOffs.map((one) => one.name));

test("Sprocket hears only the plugs of the extensions installed now", () => {
  const all = handOffs([
    "factory",
    "explorations",
    "signals",
    "personas",
    "testing",
    "releases",
  ]);
  for (const name of [
    "answer_card",
    "explore_with_doodle",
    "add_persona",
    "start_test",
    "send_signal",
  ])
    assert.ok(all.includes(name), name);
  // Personas, Testing and Explorations removed: their hand-offs and words
  // go with them.
  const fewer = sprocket(["factory", "signals"]).support.tools().plugs;
  const names = fewer.flatMap((plug) => plug.handOffs.map((one) => one.name));
  assert.ok(!names.includes("start_test"));
  assert.ok(!names.includes("explore_with_doodle"));
  assert.ok(names.includes("send_signal"));
  assert.doesNotMatch(
    plugsGuide(fewer),
    /Personas|Testing|Doodle, the explorer/,
  );
  assert.match(plugsGuide([]), /no extension that hands work on is installed/);
});

test("a signal goes only to a kobold whose extension is installed; places are only pages there are", async () => {
  const { support } = sprocket(["factory", "signals"]);
  const send = support
    .tools()
    .plugs.flatMap((plug) => plug.handOffs)
    .find((one) => one.name === "send_signal");
  assert.ok(send);
  await assert.rejects(
    Promise.resolve().then(() => send.run({ id: "S-0002", to: "doodle" })),
    /Explorations is not installed/,
  );
  assert.equal(placeIn("#explore/X-1", ["explore"]), "#explore/X-1");
  assert.equal(placeIn(" #settings ", []), "#settings");
  assert.throws(() => placeIn("#explore/X-1", []), /not a place in Kobble now/);
  assert.throws(() => placeIn("explore", ["explore"]), /not a place/);
});

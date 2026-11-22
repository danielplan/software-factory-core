import assert from "node:assert/strict";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import type { Cli } from "../src/add-ons/github/github.ts";
import { supportOf } from "../src/kobble/support.ts";
import { placeIn } from "../src/kobble/support-tools.ts";
import { plugsGuide } from "../src/kobble/support-plug.ts";

// Extensions never talk to each other; they plug into Sprocket. A removed
// extension takes its hand-offs and its words away, and nothing else breaks.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

function sprocket(installed: string[]) {
  const root = mkdtempSync(join(tmpdir(), "plug-"));
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  const store = () => new KobbleStore(root);
  const support = supportOf(
    {
      project: root,
      claude: { run: () => Promise.resolve({ ok: true, text: "" }) },
      cli: {} as Cli,
      work: () => null,
      answer: () => Promise.resolve(),
      isOn: (id) => installed.includes(id),
      supportGuides: () => [],
    },
    store,
    () => undefined,
    {
      explorations: {
        talks: { begin: () => Promise.resolve(), say: () => Promise.resolve() },
      },
      tests: { tests: { start: () => ({ persona: "noah" }) } },
    },
  );
  return { support, store };
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
    "releases",
  ]);
  for (const name of [
    "answer_card",
    "explore_with_doodle",
    "send_on_mission",
    "send_signal",
  ])
    assert.ok(all.includes(name), name);
  // Personas and Explorations removed: their hand-offs and words go with them.
  const fewer = sprocket(["factory", "signals"]).support.tools().plugs;
  const names = fewer.flatMap((plug) => plug.handOffs.map((one) => one.name));
  assert.ok(!names.includes("send_on_mission"));
  assert.ok(!names.includes("explore_with_doodle"));
  assert.ok(names.includes("send_signal"));
  assert.doesNotMatch(plugsGuide(fewer), /Personas|Doodle, the explorer/);
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

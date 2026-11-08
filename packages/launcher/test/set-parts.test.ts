import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { partSchema } from "@software-factory/core";

import { Launcher } from "../src/index.ts";

// A product added while the factory runs joins the list; the parts already
// there keep their state.

const part = (id: string) =>
  partSchema.parse({
    id,
    name: id,
    area: "products",
    does: "Something.",
    start: "never",
  });

test("a changed list of parts keeps what is known and adds what is new", () => {
  const launcher = new Launcher({
    root: mkdtempSync(join(tmpdir(), "launcher-")),
    parts: [part("shop")],
    everyMs: 60_000,
  });
  let told = 0;
  launcher.subscribe(() => (told += 1));
  try {
    launcher.setParts([part("shop"), part("blog")]);
    assert.deepEqual(
      launcher.state().map((p) => p.id),
      ["shop", "blog"],
    );
    assert.ok(told >= 1);
  } finally {
    launcher.close();
  }
});

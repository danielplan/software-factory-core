import assert from "node:assert/strict";
import { test } from "node:test";

import { kobbleFactory } from "./kobble-factory.ts";
import { stage } from "./stage.ts";

// Home asks each installed extension for the data of its blocks (its
// `home` plug); a removed one's blocks are not there.

test("Home has the data of the installed extensions' blocks", async () => {
  const factory = await kobbleFactory();
  try {
    const { blocks } = await factory.read<{
      blocks: Record<string, Record<string, unknown>>;
    }>("/api/home");
    // The two signals the example's persona test filed, the two
    // explorations being explored, and no board connected yet.
    assert.deepEqual(blocks.signals, { new: 2 });
    assert.deepEqual(blocks.exploring, { count: 2 });
    assert.equal(blocks.status?.connected, false);
    assert.deepEqual(blocks.reviews, { count: 0 });
  } finally {
    factory.close();
  }
});

test("without Kobble's own extensions, Home has no blocks' data", async () => {
  const { session, server, base } = await stage();
  try {
    const home = (await (await fetch(`${base}/api/home`)).json()) as {
      blocks: Record<string, unknown>;
    };
    assert.deepEqual(home.blocks, {});
  } finally {
    session.close();
    server.close();
  }
});

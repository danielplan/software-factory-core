import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { faceFrom } from "@software-factory/core";

import type {
  PersonaPage,
  PersonaRow,
} from "../src/extensions/personas/views.ts";
import { EXPORT, kobbleFactory } from "./kobble-factory.ts";

// The Personas pages as the server serves them, on the example company's
// records after a sync with its live app's export.

test("personas: listed with their signals, one with all of theirs, a new one", async () => {
  const factory = await kobbleFactory(pathToFileURL(EXPORT).href);
  try {
    await factory.press("/api/kobble/sync");
    await factory.press("/api/kobble/signals/dismiss", { id: "S-0004" });
    const { personas } = await factory.read<{
      personas: PersonaRow[];
    }>("/api/kobble/personas");
    assert.deepEqual(
      personas.map((p) => [p.id, p.origin, p.signals]),
      [
        ["bruno", "developer", 2],
        ["mia", "developer", 4],
        ["noah", "usage", 1],
      ],
    );
    // Each has a face: its own, or the one from its id.
    assert.deepEqual(personas[1]?.face, { hat: "phones", color: "pink" });
    const mia = await factory.read<PersonaPage>("/api/kobble/persona?id=mia");
    assert.equal(mia.persona.name, "Mia");
    assert.deepEqual(mia.signals[0]?.personaFace, {
      hat: "phones",
      color: "pink",
    });
    assert.deepEqual(
      mia.signals.map((s) => [s.id, s.status]),
      [
        ["S-0011", "new"],
        ["S-0004", "dismissed"],
        ["S-0003", "new"],
        ["S-0002", "new"],
      ],
    );
    assert.deepEqual(
      mia.tests.map((t) => t.id),
      ["T-0003", "T-0002", "T-0001"],
    );
    const none = await fetch(`${factory.base}/api/kobble/persona?id=zoe`);
    assert.equal(none.status, 409);

    const added = await factory.press("/api/kobble/personas", {
      name: "Gift Buyer",
      place: "Vienna",
      about: "Sends gifts early.",
    });
    assert.deepEqual(added.body.persona, {
      id: "gift-buyer",
      name: "Gift Buyer",
      place: "Vienna",
      about: "Sends gifts early.",
      origin: "developer",
      customers: [],
      // Its kobold from what it is: a cap (nothing matches), the colour
      // from its name.
      face: faceFrom({ name: "Gift Buyer" }),
    });
    const twin = await factory.press("/api/kobble/personas", {
      name: "Gift buyer",
      face: { hat: "beret", color: "violet" },
    });
    assert.equal((twin.body.persona as { id: string }).id, "gift-buyer-2");
    assert.deepEqual((twin.body.persona as { face: unknown }).face, {
      hat: "beret",
      color: "violet",
    });
    // The kobold's own floppy cap is never a persona's.
    const flop = await factory.press("/api/kobble/personas", {
      name: "Copy",
      face: { hat: "flop", color: "blue" },
    });
    assert.equal(flop.status, 409);
    const nameless = await factory.press("/api/kobble/personas", { name: " " });
    assert.equal(nameless.status, 409);
    assert.equal(nameless.body.error, "Say the persona's name.");
  } finally {
    factory.close();
  }
});

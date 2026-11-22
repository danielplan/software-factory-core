import assert from "node:assert/strict";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { faceFrom, KobbleStore } from "@software-factory/core";

import { SETUP_AREAS } from "../src/api.ts";
import { recordsFromSetup } from "../src/coach/setup-records.ts";
import { plugsOf } from "./plugs.ts";

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

const card = (id: string, area: string, title: string, text?: string) => ({
  id,
  area,
  title,
  ...(text ? { text } : {}),
  confirmed: true,
});

test("setup's people become personas, its starting points explorations, once", () => {
  const root = join(mkdtempSync(join(tmpdir(), "setup-records-")), "factory");
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  const map = {
    cards: [
      card(
        "c1",
        SETUP_AREAS.people,
        "Boat owner",
        "Owns a yacht; books a mooring",
      ),
      card("c2", SETUP_AREAS.people, "Courier", "Drives the tanker"),
      card(
        "c3",
        SETUP_AREAS.start,
        "Delivery exceptions",
        "The truck can't reach the boat.",
      ),
      {
        ...card("c4", SETUP_AREAS.people, "Who else?"),
        tone: "question" as const,
      },
      card("c5", SETUP_AREAS.product, "Shop app"),
    ],
  };
  assert.deepEqual(recordsFromSetup(map, plugsOf(new KobbleStore(root))), {
    personas: 2,
    explorations: 1,
  });
  const store = new KobbleStore(root);
  const owner = store.all("personas").find((p) => p.name === "Boat owner");
  assert.equal(owner?.face?.hat, "captain");
  assert.ok(
    store.all("explorations").some((x) => x.title === "Delivery exceptions"),
  );
  assert.deepEqual(recordsFromSetup(map, plugsOf(new KobbleStore(root))), {
    personas: 0,
    explorations: 0,
  });
});

test("a persona's kobold dresses for what it does; the colour follows the name", () => {
  assert.equal(
    faceFrom({ name: "Courier", about: "Drives the tanker" }).hat,
    "trucker",
  );
  assert.equal(
    faceFrom({ name: "Operator", about: "Shop staff on the phone" }).hat,
    "phones",
  );
  assert.equal(faceFrom({ name: "Baker" }).hat, "toque");
  assert.equal(
    faceFrom({ name: "Mia", about: "Shops on her phone" }).hat,
    "cap",
  );
  assert.equal(
    faceFrom({ name: "Mia" }).color,
    faceFrom({ name: "Mia", about: "else" }).color,
  );
});

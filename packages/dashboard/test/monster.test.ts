import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HATS,
  HUES,
  monsterOf,
  tintIndexOf,
  WEARS,
} from "../src/lib/monster.ts";

// Each persona's little kobold: the same name, the same one; the example's
// four clearly different; every hat, colour and thing worn in use.

test("the same name is always the same little kobold, whatever its case", () => {
  assert.deepEqual(monsterOf("Mia"), monsterOf("Mia"));
  assert.deepEqual(monsterOf("Mia"), monsterOf(" mia "));
});

test("the example's four personas look clearly different", () => {
  const four = ["Mia", "Bruno", "Noah", "Ines"].map((name, at) =>
    monsterOf(name, at),
  );
  assert.equal(new Set(four.map((m) => m.hat)).size, 4);
  assert.equal(new Set(four.map((m) => m.wears)).size, 4);
  assert.equal(new Set(four.map((m) => m.hue)).size, 4);
});

test("across many names every hat, colour and thing worn is used", () => {
  const many = Array.from({ length: 400 }, (_, at) =>
    monsterOf(`p${String(at)}`),
  );
  const used = (key: "hat" | "wears" | "hue") =>
    new Set(many.map((m) => m[key])).size;
  assert.equal(used("hat"), HATS.length);
  assert.equal(used("wears"), WEARS.length);
  assert.equal(used("hue"), HUES.length);
});

test("the colour follows the persona's tint when there is one", () => {
  assert.equal(tintIndexOf("bg-persona-3"), 2);
  assert.equal(tintIndexOf("bg-card"), null);
  assert.equal(monsterOf("Anyone", 0).hue, "cyan");
  assert.equal(monsterOf("Anyone", 4).hue, "rose");
  assert.equal(monsterOf("Anyone", 5).hue, "cyan");
});

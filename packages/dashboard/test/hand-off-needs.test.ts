import assert from "node:assert/strict";
import { test } from "node:test";

import type { Thing } from "../src/extensions/explorations/board/nodes.ts";
import { handOffMissing } from "../src/extensions/explorations/hand-off-needs.ts";

// Hand off stays off until the board holds what the builder builds from, and
// the page says which of these is missing.

const thing = (fields: object): Thing => fields as Thing;
const prototype = (fields: object = {}) =>
  thing({ kind: "prototype", key: "A", agreed: false, ...fields });
const variants = [{ key: "A" }, { key: "B" }];

test("a board with a prototype that nobody agreed asks for it", () => {
  assert.equal(
    handOffMissing([thing({ kind: "choice", agreed: true }), prototype()]),
    "prototype",
  );
});

test("an agreed prototype with several variants asks for the variant", () => {
  assert.equal(
    handOffMissing([prototype({ agreed: true, variants })]),
    "variant",
  );
  assert.equal(
    handOffMissing([prototype({ agreed: true, variants, variant: "B" })]),
    null,
  );
});

test("an agreed prototype of one way only is ready", () => {
  assert.equal(handOffMissing([prototype({ agreed: true })]), null);
});

test("without a prototype, something agreed is needed", () => {
  assert.equal(
    handOffMissing([thing({ kind: "note", agreed: false })]),
    "something",
  );
  assert.equal(handOffMissing([]), "something");
  assert.equal(handOffMissing([thing({ kind: "note", agreed: true })]), null);
});

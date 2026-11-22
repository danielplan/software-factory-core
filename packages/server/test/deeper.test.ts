import assert from "node:assert/strict";
import { test } from "node:test";

import { deeperIn } from "../src/extensions/explorations/deeper.ts";
import type { Made } from "../src/extensions/explorations/versions.ts";

// The team picked a variant: it stays as the base, the others go, and new
// variants refine it.

const made = {
  id: "prototype-a",
  kind: "prototype",
  key: "A",
  name: "Feedback",
  variants: [
    { key: "A", name: "A form", difference: "fields" },
    { key: "B", name: "One inbox", difference: "all in one" },
    { key: "C", name: "Tell the kobold", difference: "a chat" },
  ],
} as unknown as Made;

test("digging deeper keeps one variant, drops the others and adds refinements of it", () => {
  const dug = deeperIn(made, "c", [
    { name: "Chips first", difference: "three chips before the box" },
    { name: "Box first", difference: "the box, chips under it" },
  ]);
  assert.deepEqual(
    dug.made.variants?.map((one) => one.key),
    ["C", ...dug.keys],
  );
  assert.equal(dug.keys.length, 2);
  assert.equal(dug.made.variant, "C");
  assert.match(dug.request, /take out the code of the other variants \(A, B\)/);
  assert.match(dug.request, /“Chips first”/);
});

test("an unknown variant, or none or too many new ones, is refused", () => {
  const way = { name: "x", difference: "y" };
  assert.throws(() => deeperIn(made, "Z", [way]), /no variant Z/);
  assert.throws(() => deeperIn(made, "A", []), /one to 3 new variants/);
  assert.throws(
    () => deeperIn(made, "A", [way, way, way, way]),
    /one to 3 new variants/,
  );
});

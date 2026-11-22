import assert from "node:assert/strict";
import { test } from "node:test";

import { statesIn } from "../src/extensions/explorations/versions.ts";

// The states a maker said each variant can be shown in.

test("the maker's States line names the states, short and lowercase", () => {
  assert.deepEqual(
    statesIn(
      "Made the inbox.\nStates: `empty`, Loading, a problem!, many-items.\nOpens at: #signals",
    ),
    ["empty", "loading", "many-items"],
  );
});

test("no States line, or none that fit: no states", () => {
  assert.equal(statesIn("Made it.\nOpens at: #build"), undefined);
  assert.equal(statesIn("States: none at all, ???"), undefined);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { draw, EMPTY } from "../src/coach/map.ts";

// The setup coach says when the map holds what building the factory needs:
// only then is the owner offered to build it.

test("the coach offers building once the map is ready, and can take it back", () => {
  const picture = (path: string) => path;
  assert.equal(EMPTY.ready, undefined);
  const ready = draw(EMPTY, { ready: true }, picture);
  assert.equal(ready.draft.ready, true);
  assert.deepEqual(ready.said, ["The owner is offered to build the factory."]);
  const back = draw(ready.draft, { ready: false }, picture);
  assert.equal(back.draft.ready, false);
  assert.deepEqual(back.said, [
    "The owner is not offered to build the factory yet.",
  ]);
  assert.equal(draw(back.draft, {}, picture).draft.ready, false);
});

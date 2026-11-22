import assert from "node:assert/strict";
import { test } from "node:test";

import { toStart } from "../src/extensions/explorations/board/prototype-shown.ts";
import { areaOf } from "../src/extensions/explorations/view.ts";

// An exploration's board in small, in the list: the part of the whiteboard
// its things cover, so all of it fits.

test("the board in small covers every thing, with a margin", () => {
  const size = { width: 100, height: 30 };
  assert.deepEqual(
    areaOf(
      [
        { x: 0, y: 0 },
        { x: 300, y: -50 },
      ],
      size,
      10,
    ),
    { x: -10, y: -60, width: 420, height: 100 },
  );
  assert.deepEqual(areaOf([], size), { x: 0, y: 0, width: 0, height: 0 });
});

// The board starts its prototype by itself, so the canvas shows the real
// screen.

const pageWith = (
  status: string,
  things: { kind: string; key?: string; agreed: boolean }[],
  runs: { version: string; state: string }[],
) => ({ exploration: { status }, board: { things }, runs }) as never;

test("the agreed prototype starts, otherwise the newest, when none runs", () => {
  const a = { kind: "prototype", key: "A", agreed: false };
  const b = { kind: "prototype", key: "B", agreed: false };
  assert.equal(toStart(pageWith("exploring", [a, b], [])), "B");
  assert.equal(
    toStart(pageWith("exploring", [{ ...a, agreed: true }, b], [])),
    "A",
  );
  assert.equal(
    toStart(
      pageWith("exploring", [a, b], [{ version: "A", state: "running" }]),
    ),
    null,
  );
  assert.equal(
    toStart(pageWith("exploring", [a], [{ version: "A", state: "failed" }])),
    null,
  );
  assert.equal(toStart(pageWith("handed-off", [a], [])), null);
  assert.equal(toStart(pageWith("exploring", [], [])), null);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { elapsed, phaseOf } from "../src/lib/mission-live.ts";

test("a mission is getting the app ready, then used, then written down", () => {
  assert.equal(phaseOf({ status: "queued", doing: null, steps: [] }), "ready");
  assert.equal(phaseOf({ status: "running", doing: null, steps: [] }), "ready");
  assert.equal(
    phaseOf({ status: "running", doing: "Step 2: the basket", steps: [] }),
    "using",
  );
  const step = { did: "Opened it", expected: "It opens", asExpected: true };
  assert.equal(
    phaseOf({ status: "running", doing: null, steps: [step] }),
    "writing",
  );
});

test("how long it has been going, as m:ss", () => {
  const from = "2026-11-23T10:00:00.000Z";
  assert.equal(elapsed(null, 0), "0:00");
  assert.equal(elapsed(from, Date.parse(from) + 65_000), "1:05");
  assert.equal(elapsed(from, Date.parse(from) - 5_000), "0:00");
});

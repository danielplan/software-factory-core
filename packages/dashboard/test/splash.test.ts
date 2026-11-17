import assert from "node:assert/strict";
import { test } from "node:test";

import { AT_LEAST_MS, openingTimes } from "../src/lib/splash.ts";

// The opening: never a flash, quicker and still with reduced motion.

test("the opening waits until it has shown long enough, then fades away", () => {
  assert.deepEqual(openingTimes(0, false), { wait: AT_LEAST_MS, part: 800 });
  assert.deepEqual(openingTimes(1000, false), { wait: 600, part: 800 });
  assert.deepEqual(openingTimes(5000, false), { wait: 0, part: 800 });
  assert.deepEqual(openingTimes(0, true), { wait: 600, part: 260 });
});

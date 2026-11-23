import assert from "node:assert/strict";
import { test } from "node:test";

import {
  closeTeam,
  openTeam,
  panelNow,
  report,
  reportsNow,
} from "../src/lib/meet.ts";

// What the extensions report of their kobolds, and the panel's state.

test("a kobold's words are kept until its extension takes them away", () => {
  report("maker", { now: "Version A: at work", last: null });
  assert.deepEqual(reportsNow().maker, {
    now: "Version A: at work",
    last: null,
  });
  // The same words again change nothing (the same object stays).
  const before = reportsNow();
  report("maker", { now: "Version A: at work", last: null });
  assert.equal(reportsNow(), before);
  report("maker", null);
  assert.equal(reportsNow().maker, undefined);
});

test("the panel opens with the kobold you came from lit, and closes with none", () => {
  assert.equal(panelNow().open, false);
  openTeam("maker");
  assert.equal(panelNow().open, true);
  assert.equal(panelNow().focus, "maker");
  // Another face opens it again with that one lit.
  openTeam("builder");
  assert.equal(panelNow().focus, "builder");
  closeTeam();
  assert.equal(panelNow().open, false);
  assert.equal(panelNow().focus, null);
  openTeam();
  assert.equal(panelNow().focus, null);
  closeTeam();
});

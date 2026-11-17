import assert from "node:assert/strict";
import { test } from "node:test";

import type { SignalRow } from "../src/api.ts";
import { countsOf, koboldLine } from "../src/lib/shell-view.ts";
import {
  agoOf,
  alreadyLine,
  countWords,
  exploreWords,
  nextAfter,
  originWords,
  personaPlaceOf,
  primaryOf,
  shownOf,
  statusWords,
  syncLine,
  tintIndexOf,
  whoOf,
} from "../src/signals/view.ts";

// What the Signals and Personas pages say.

const NOW = new Date("2026-11-17T10:00:00.000Z");

const row = (more: Partial<SignalRow> = {}): SignalRow => ({
  id: "S-0001",
  type: "bug",
  source: "app",
  sourceId: "ev-1",
  customer: null,
  persona: null,
  personaName: null,
  personaFace: null,
  at: "2026-11-17T09:50:00.000Z",
  text: "It broke.",
  status: "new",
  to: null,
  already: null,
  ...more,
});

test("a bug puts Fix first, anything else Explore", () => {
  assert.equal(primaryOf(row()), "fix");
  assert.equal(primaryOf(row({ type: "request" })), "explore");
  assert.equal(primaryOf(row({ type: "feedback" })), "explore");
});

test("work found already: one plain line, and Explore becomes Add to", () => {
  const explored = row({
    already: {
      kind: "exploration",
      id: "X-2",
      title: "Hours for the accountant",
    },
  });
  assert.deepEqual(alreadyLine(explored), {
    words: "Already explored in",
    what: "X-2 · Hours for the accountant",
  });
  assert.equal(exploreWords(explored), "Add to X-2");
  const fixed = row({ already: { kind: "work", id: "#41", title: "Email" } });
  assert.deepEqual(alreadyLine(fixed), {
    words: "Already fixed in",
    what: "#41 · Email",
  });
  assert.equal(exploreWords(fixed), "Explore");
  assert.equal(alreadyLine(row()), null);
});

test("who a signal is from, and what became of it", () => {
  assert.equal(whoOf(row()), "Someone");
  assert.equal(whoOf(row({ personaName: "Mia" })), "Mia");
  assert.equal(statusWords(row()), "New");
  assert.equal(
    statusWords(row({ status: "explored", to: "X-1" })),
    "Explored in X-1",
  );
  assert.equal(statusWords(row({ status: "fixed" })), "Sent to be fixed");
  assert.equal(
    statusWords(row({ status: "fixed", to: "#41" })),
    "Fixed in #41",
  );
  assert.equal(statusWords(row({ status: "dismissed" })), "Dismissed");
  assert.equal(originWords("usage"), "Found in usage");
  assert.equal(originWords("developer"), "Added by you");
  assert.equal(countWords(1, "signal", "signals"), "1 signal");
  assert.equal(countWords(0, "signal", "signals"), "0 signals");
  assert.equal(tintIndexOf("mia"), tintIndexOf("mia"));
});

test("times are said plainly, and the sync line says where it stands", () => {
  assert.equal(agoOf("2026-11-17T09:59:40.000Z", NOW), "just now");
  assert.equal(agoOf("2026-11-17T09:50:00.000Z", NOW), "10 min ago");
  assert.equal(agoOf("2026-11-17T07:00:00.000Z", NOW), "3 h ago");
  assert.equal(agoOf("2026-11-16T08:00:00.000Z", NOW), "yesterday");
  assert.equal(agoOf("2026-11-13T08:00:00.000Z", NOW), "4 days ago");
  assert.equal(
    syncLine({ connected: false, last: null, problem: null }, NOW),
    "Not connected to the live app",
  );
  assert.equal(
    syncLine({ connected: true, last: null, problem: null }, NOW),
    "Not synced with the live app yet · every 30 min",
  );
  assert.equal(
    syncLine(
      { connected: true, last: "2026-11-17T09:50:00.000Z", problem: null },
      NOW,
    ),
    "Synced with the live app 10 min ago · every 30 min",
  );
});

test("the signal shown, and the next one once it is handled", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(shownOf(list, "b")?.id, "b");
  assert.equal(shownOf(list, "gone")?.id, "a");
  assert.equal(shownOf([], null), null);
  assert.equal(nextAfter(list, "b"), "c");
  assert.equal(nextAfter(list, "c"), "b");
  assert.equal(nextAfter([{ id: "a" }], "a"), null);
});

test("the sidebar counts the new signals as a badge", () => {
  assert.deepEqual(countsOf(null, null, 3), { signals: 3 });
  assert.deepEqual(countsOf(null, null, 0), {});
  assert.deepEqual(countsOf(null, null), {});
});

test("the kobold's card says what it does, or Idle", () => {
  assert.equal(
    koboldLine({ busy: false, title: "Kobold is resting", detail: "" }),
    "Idle",
  );
  assert.equal(
    koboldLine({ busy: true, title: "Kobold is building", detail: "#12" }),
    "Building",
  );
});

test("a persona's page opens on their signals, their tests or one test", () => {
  assert.deepEqual(personaPlaceOf("mia"), {
    persona: "mia",
    tab: "signals",
    test: null,
  });
  assert.deepEqual(personaPlaceOf("mia/tests"), {
    persona: "mia",
    tab: "tests",
    test: null,
  });
  assert.deepEqual(personaPlaceOf("mia/tests/T-0001"), {
    persona: "mia",
    tab: "tests",
    test: "T-0001",
  });
});

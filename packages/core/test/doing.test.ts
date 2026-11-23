import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DOING_KINDS,
  type DoingKind,
  doingOf,
  stageOf,
} from "../src/kobble/doing.ts";

// What a kobold's action is sorted into: the kind says what it touches, the
// page puts it in words; the stage follows the first read and the first
// drawing.

const SORTED: [string, DoingKind][] = [
  ["Reading packages/dashboard/product.json", "read-settings"],
  ["Reading docs/reference/design-system.md", "read-design"],
  ["Reading docs/explanation/architecture.md", "read-structure"],
  ["Reading docs/index.md", "read-notes"],
  ["Reading src/features/home/page.tsx", "read-screen"],
  ["Reading src/main.ts", "read-other"],
  ["Looking for files **/product.json", "find-settings"],
  ["Looking for files docs/**/*.md", "find-notes"],
  ["Looking for files src/**/*.tsx", "find-screens"],
  ["Looking for files **/*.json", "look-around"],
  ["Searching for “exploration”", "search"],
  ["Looking through files: src/extensions", "look-around"],
  ["Looking up how boards work", "look-up"],
  ["Asking a helper: check the notes", "helper"],
  ["Getting started", "start"],
  ["Starting the change", "start"],
  ["Working out how to start the app", "start"],
  ["Using add choice (setup)", "draw-choice"],
  ["Using add note (setup)", "draw-note"],
  ["Using add diagram (setup)", "draw-diagram"],
  ["Using change thing (setup)", "draw-change"],
  ["Using link (setup)", "draw-link"],
  ["Using make prototype (setup)", "draw-prototype"],
  ["Using mcp__setup__draw", "draw"],
  ["Editing src/pay.tsx", "edit"],
  ["Writing src/pay.tsx", "write"],
  ["Running the tests: pay.test.ts", "test"],
  ["Checking the types", "check"],
  ["Installing packages", "install"],
  ["Building: dashboard", "build"],
  ["In the browser: click", "browser"],
  ["Working with git: diff main", "git"],
  ["Updating its to-do list", "plan"],
  ["Running: start the app", "run"],
];

test("each kind of action is sorted into the kind it touches", () => {
  for (const [line, kind] of SORTED) assert.equal(doingOf(line), kind, line);
});

test("an action that fits no kind is unknown, and the kobold's own words are not an action", () => {
  assert.equal(doingOf("Using look at board (setup)"), "unknown");
  assert.equal(doingOf("Using the explore skill"), "unknown");
  assert.equal(doingOf("Now, how ideas are kept"), null);
  assert.equal(doingOf("I'll draw two ways to say it"), null);
  assert.equal(doingOf("Finished in 12 s"), null);
});

test("the stage moves on the first read or search and on the first drawing", () => {
  for (const kind of DOING_KINDS) {
    const expected = /^(draw)/.test(kind)
      ? 2
      : /^(read-|find-)|^(search|look-around|look-up)$/.test(kind)
        ? 1
        : 0;
    assert.equal(stageOf(kind), expected, kind);
  }
  assert.equal(stageOf("start"), 0);
  assert.equal(stageOf("unknown"), 0);
  assert.equal(stageOf("helper"), 0);
});

test("every kind is sorted to by some action", () => {
  const used = new Set([...SORTED.map(([, kind]) => kind), "unknown"]);
  assert.deepEqual(
    DOING_KINDS.filter((kind) => !used.has(kind)),
    [],
  );
});

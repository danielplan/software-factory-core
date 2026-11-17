import assert from "node:assert/strict";
import { test } from "node:test";

import type { IdeaRow, PersonaCard, StoryCard } from "../src/api.ts";
import { riverOf, riverPath } from "../src/lib/river.ts";

// The Overview's river: what reached each stage, from heard to worked.

const idea = (stage: IdeaRow["stage"]): IdeaRow => ({
  id: stage,
  title: stage,
  persona: null,
  state: "exploring",
  stage,
  versions: 0,
});
const persona = (stories: Partial<StoryCard>[]): PersonaCard =>
  ({
    stories: stories.map((one) => ({ wrong: null, ...one })),
  }) as unknown as PersonaCard;

test("each stage counts what reached it at least, and the headline says how it goes", () => {
  const river = riverOf(
    [persona([{}, {}, { wrong: "No" }]), persona([{}])],
    [
      idea("versions"),
      idea("picked"),
      idea("building"),
      idea("building"),
      idea("inApp"),
      idea("worked"),
      idea("didntWork"),
    ],
  );
  assert.deepEqual(
    river.stages.map((one) => [one.label, one.count]),
    [
      ["Heard", 3],
      ["Ideas", 7],
      ["Sent to Build", 5],
      ["In the app", 3],
      ["Worked", 1],
    ],
  );
  assert.equal(river.stages[2]?.words, "5 sent to Build");
  assert.equal(river.headline, "1 of 7 ideas worked so far · 2 being built");
  assert.equal(
    riverOf([], [idea("worked")]).headline,
    "1 of 1 idea worked so far",
  );
  assert.equal(
    riverOf([], []).headline,
    "Nothing tried yet: start with an idea.",
  );
});

test("the river is as wide as each count, a thin thread for nothing, joined by curves", () => {
  const path = riverPath([10, 5, 0], 300, 100);
  assert.match(path, /^M 0 /);
  assert.match(path, / Z$/);
  // The widest stage takes most of the height around the middle (50).
  assert.match(path, /M 0 9 L 50 9 /);
  // Nothing is a 4px thread: 48 to 52.
  assert.match(path, / 250 48 /);
  assert.match(path, / 250 52 /);
  assert.equal(riverPath([], 300, 100), "");
  assert.match(riverPath([0, 0], 100, 100), /M 0 48 /);
});

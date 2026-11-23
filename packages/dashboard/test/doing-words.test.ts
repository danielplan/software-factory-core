import assert from "node:assert/strict";
import { test } from "node:test";

import { DOING_KINDS } from "../../core/src/kobble/doing.ts";
import { LOCALES } from "../src/i18n/locale.ts";
import { resources } from "../src/i18n/resources.ts";
import { Steady } from "../src/extensions/explorations/steady.ts";

// The words for what a kobold does, in each language, and how long each
// step stays on show.

const FORBIDDEN: Record<string, RegExp> = {
  en: /\b(code|files?|pages?|descriptions?)\b/i,
  it: /\b(codice|file|pagin[ae]|descrizion[ei])\b/i,
  de: /\b(code|dateien|datei|seiten?|beschreibung(en)?)\b/i,
};

test("every kind of action has words in every language, in everyday words", () => {
  for (const locale of LOCALES) {
    const words = resources[locale].translation.explore.doing as Record<
      string,
      string
    >;
    assert.deepEqual(Object.keys(words).sort(), [...DOING_KINDS].sort());
    for (const kind of DOING_KINDS) {
      assert.ok(words[kind]?.trim(), `${locale} ${kind}`);
      assert.doesNotMatch(
        words[kind] ?? "",
        FORBIDDEN[locale] ?? /$^/,
        `${locale} ${kind}`,
      );
    }
  }
});

test("the card's stages and hint use everyday words in every language", () => {
  for (const locale of LOCALES) {
    const reading = resources[locale].translation.explore.reading;
    assert.doesNotMatch(
      JSON.stringify([reading.hint, reading.steps]),
      FORBIDDEN[locale] ?? /$^/,
      locale,
    );
  }
  const en = resources.en.translation.explore.reading;
  assert.equal(en.steps.idea.doing, "Reading your idea");
  assert.equal(en.steps.product.doing, "Learning how the product works");
  assert.equal(en.steps.board.doing, "Drawing on the board");
  assert.equal(en.hint, "It draws once it understands your idea");
});

// A clock the test moves by hand.
function handClock() {
  let now = 0;
  let waiting: { at: number; run: () => void } | null = null;
  return {
    clock: {
      now: () => now,
      later: (run: () => void, ms: number) => {
        waiting = { at: now + ms, run };
        return () => {
          waiting = null;
        };
      },
    },
    pass(ms: number) {
      now += ms;
      if (waiting && waiting.at <= now) {
        const { run } = waiting;
        waiting = null;
        run();
      }
    },
  };
}

test("a step stays on show a few seconds; only the newest of those that come meanwhile follows", () => {
  const hand = handClock();
  const steady = new Steady("a", 3000, hand.clock);
  hand.pass(5000);
  steady.offer("b");
  assert.equal(steady.get(), "b", "its time was up: at once");
  steady.offer("c");
  steady.offer("d");
  assert.equal(steady.get(), "b", "b is still on show");
  hand.pass(2999);
  assert.equal(steady.get(), "b");
  hand.pass(1);
  assert.equal(steady.get(), "d", "c is skipped");
});

test("a new start shows at once and drops what waited", () => {
  const hand = handClock();
  const steady = new Steady("a", 3000, hand.clock);
  let changes = 0;
  steady.subscribe(() => {
    changes += 1;
  });
  steady.offer("b");
  steady.reset("c");
  assert.equal(steady.get(), "c");
  hand.pass(4000);
  assert.equal(steady.get(), "c");
  steady.reset("c");
  assert.equal(changes, 1);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { LOCALES } from "../src/i18n/locale.ts";
import { messagesIn } from "../src/i18n/messages.ts";
import { stopWords } from "../src/i18n/server-texts.ts";
import { resources } from "../src/i18n/resources.ts";
import {
  readsTheBoard,
  STEPS,
  stepStates,
} from "../src/extensions/explorations/board/reading.ts";

// The reading card on the empty board: when it shows, where its steps are
// (from what the explorer reports), and why it stopped, in each language.

const pageWith = (
  things: number,
  status: string,
  talk: { writing: string | null; problem: string | null },
) =>
  ({
    exploration: { status },
    board: { things: Array.from({ length: things }) },
    talk,
  }) as never;

test("the card shows on an empty board while the explorer answers or once it stopped", () => {
  const writing = { writing: "", problem: null };
  assert.equal(readsTheBoard(pageWith(0, "exploring", writing)), true);
  assert.equal(
    readsTheBoard(pageWith(0, "exploring", { writing: null, problem: "x" })),
    true,
  );
  assert.equal(
    readsTheBoard(pageWith(0, "exploring", { writing: null, problem: null })),
    false,
    "nothing is happening",
  );
  assert.equal(readsTheBoard(pageWith(1, "exploring", writing)), false);
  assert.equal(readsTheBoard(pageWith(0, "waiting", writing)), false);
});

test("the steps are where the explorer reported them, and a stop marks the step it stopped at", () => {
  assert.deepEqual(stepStates({ step: 0, problem: null }), [
    "active",
    "waiting",
    "waiting",
  ]);
  assert.deepEqual(stepStates({ step: 1, problem: null }), [
    "done",
    "active",
    "waiting",
  ]);
  assert.deepEqual(stepStates({ step: 2, problem: null }), [
    "done",
    "done",
    "active",
  ]);
  assert.deepEqual(stepStates({ step: 1, problem: "It broke" }), [
    "done",
    "stopped",
    "waiting",
  ]);
});

test("the reason is in plain words in each language, with the way out apart", () => {
  const server = {
    signedOut:
      "Claude Code is not signed in. Run claude once in a terminal to sign in, then try again.",
    none: "The explorer stopped: no reason given. Try again.",
    some: "The explorer stopped: it ran out of room. Try again.",
  };
  const en = messagesIn("en");
  assert.equal(
    stopWords(server.signedOut, en).reason,
    "Claude Code is not signed in",
  );
  assert.equal(
    stopWords(server.none, en).reason,
    "The explorer stopped: no reason given",
  );
  assert.equal(
    stopWords(server.some, en).reason,
    "The explorer stopped: it ran out of room",
  );
  assert.equal(
    stopWords("Claude Code is not on this computer. Install it.", en).reason,
    "Claude Code is not on this computer",
  );
  assert.equal(stopWords("Something else.", en).reason, "Something else");
  for (const locale of LOCALES.filter((one) => one !== "en")) {
    const said = messagesIn(locale);
    for (const problem of Object.values(server))
      assert.notEqual(
        stopWords(problem, said).reason,
        stopWords(problem, en).reason,
        `${locale}: ${problem}`,
      );
  }
});

test("the card never says anything about time, in any language", () => {
  const TIME = /\d|sec|min|ora|ore|stund|usually|solit|normalerweise|bar/i;
  for (const locale of LOCALES) {
    const reading = resources[locale].translation.explore.reading;
    const texts = JSON.stringify(reading).replaceAll(/\{\{\w+\}\}/g, "");
    assert.doesNotMatch(texts, TIME, locale);
  }
  assert.equal(STEPS.length, 3);
});

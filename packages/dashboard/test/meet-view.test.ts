import assert from "node:assert/strict";
import { test } from "node:test";

import type { CardView, WorkView } from "../src/api/client.ts";
import { messagesIn } from "../src/i18n/messages.ts";
import { LOCALES } from "../src/i18n/locale.ts";
import { TEAM } from "../src/lib/kobolds.ts";
import {
  builderTag,
  builtLast,
  exploredLast,
  isLit,
  isWorking,
  lineOf,
  madeLast,
  makerNow,
  makerTag,
  minutesLeft,
  shownInGroup,
  sorterNow,
  sorterTag,
  testerNow,
  testerTag,
} from "../src/lib/meet-view.ts";
import { koboldsLast } from "../src/lib/shell-view.ts";

// The name tags, the sidebar's "Your kobolds" and the panel: what each says
// for each state, who is shown, who is lit, who works or rests.

const en = messagesIn("en");
const START = "2026-11-23T10:00:00Z";
const at = (seconds: number) => Date.parse(START) + seconds * 1000;

test("Tinker's tag says what it makes, about how long and that there is nothing to do", () => {
  assert.equal(
    makerTag({ version: "A", since: START }, at(10), en),
    "Making variant A to try · about 3 min · nothing to do until it's ready",
  );
  assert.equal(
    makerTag({ version: "B", since: START }, at(65), en),
    "Making variant B to try · about 2 min · nothing to do until it's ready",
  );
});

test("the estimate counts down from a typical three minutes and then says a little longer", () => {
  assert.equal(minutesLeft(START, at(0)), 3);
  assert.equal(minutesLeft(START, at(125)), 1);
  assert.equal(minutesLeft(START, at(181)), 0);
  assert.match(
    makerTag({ version: "A", since: START }, at(400), en),
    /a little longer/,
  );
  // Nobody knows when it began: the typical time.
  assert.equal(minutesLeft(null, at(0)), 3);
});

test("Bolt's tag names the card and, when it has one, what it does", () => {
  assert.equal(
    builderTag(12, null, en),
    "Building card #12 · nothing to do, it asks here if it gets stuck",
  );
  assert.equal(
    builderTag(12, "Writing the test", en),
    "Building card #12: Writing the test · nothing to do, it asks here if it gets stuck",
  );
});

test("Mimic's tag follows its test: waiting, playing a step, played", () => {
  assert.match(
    testerTag({ status: "queued", steps: 0 }, "Mia", en) ?? "",
    /^Waiting its turn to play Mia/,
  );
  assert.match(
    testerTag({ status: "running", steps: 2 }, "Mia", en) ?? "",
    /^Playing Mia on this mission, step 3/,
  );
  assert.match(
    testerTag({ status: "done", steps: 3 }, "Mia", en) ?? "",
    /^Played Mia on this mission: 3 steps/,
  );
  assert.match(
    testerTag({ status: "done", steps: 1 }, "Mia", en) ?? "",
    /: 1 step ·/,
  );
  // A test that failed did not finish playing.
  assert.equal(testerTag({ status: "failed", steps: 1 }, "Mia", en), null);
});

test("Sieve's tag counts the signals it sorts, or watches", () => {
  assert.equal(
    sorterTag(3, en),
    "Sorting 3 new signals · nothing to do, pick one below",
  );
  assert.match(sorterTag(1, en), /^Sorting 1 new signal ·/);
  assert.match(sorterTag(0, en), /^Watching for what comes in/);
});

test("the live line of each kobold, and none when it rests", () => {
  assert.equal(
    makerNow({ version: "A", activity: "Making the basket page" }, en),
    "Version A: Making the basket page",
  );
  assert.equal(
    makerNow({ version: "A", activity: null }, en),
    "Version A: at work",
  );
  assert.equal(makerNow(null, en), null);
  assert.equal(testerNow([], en), null);
  assert.equal(testerNow(["Mia"], en), "Playing Mia on a mission");
  assert.equal(testerNow(["Mia", "Omar"], en), "Playing 2 missions");
  assert.equal(sorterNow(0, en), null);
  assert.equal(sorterNow(1, en), "Sorting 1 new signal");
  assert.equal(sorterNow(4, en), "Sorting 4 new signals");
});

test("Tinker is in the sidebar's group only while it works", () => {
  const rest = shownInGroup({ builder: "Building #4" }).map((one) => one.id);
  assert.deepEqual(rest, [
    "support",
    "explorer",
    "builder",
    "tester",
    "sorter",
  ]);
  const busy = shownInGroup({ maker: "Version A: at work" }).map(
    (one) => one.id,
  );
  // Under Doodle.
  assert.deepEqual(busy, [
    "support",
    "explorer",
    "maker",
    "builder",
    "tester",
    "sorter",
  ]);
  // The panel always has everybody.
  assert.equal(TEAM.length, 6);
});

test("the kobold you came from is lit, and a kobold with a line works", () => {
  assert.equal(isLit("maker", "maker"), true);
  assert.equal(isLit("maker", "builder"), false);
  assert.equal(isLit(null, "maker"), false);
  const now = { builder: "Building #4" };
  assert.equal(isWorking(now, "builder"), true);
  assert.equal(isWorking(now, "tester"), false);
  assert.deepEqual(lineOf(now, { tester: "Played Mia" }, "builder"), {
    now: "Building #4",
    last: null,
  });
  assert.deepEqual(lineOf(now, { tester: "Played Mia" }, "tester"), {
    now: null,
    last: "Played Mia",
  });
});

const card = (number: number, stage: CardView["stage"]): CardView => ({
  number,
  title: `Card ${String(number)}`,
  stage,
  column: "",
  url: "",
  pullRequest: null,
  closed: false,
  asks: false,
});
const work = (cards: CardView[]) => ({ cards }) as WorkView;

test("what each kobold did last, where the page knows it", () => {
  assert.equal(builtLast(null, en), null);
  assert.equal(builtLast(work([card(3, "doing")]), en), null);
  assert.equal(
    builtLast(work([card(3, "done"), card(7, "review"), card(9, "doing")]), en),
    "Built card #7, “Card 7”",
  );
  assert.equal(exploredLast([], en), null);
  assert.equal(
    exploredLast([{ title: "Bring it back" }], en),
    "Thought through “Bring it back”",
  );
  assert.equal(madeLast([{ things: [] }], en), null);
  assert.equal(
    madeLast(
      [
        {
          things: [
            { id: "t1", kind: "problem", agreed: false, label: "x" },
            { id: "t2", kind: "prototype", agreed: false, label: "Email" },
          ],
        },
      ],
      en,
    ),
    "Made prototype “Email”",
  );
  assert.deepEqual(
    koboldsLast(work([card(2, "done")]), [{ title: "Basket" }], en),
    {
      builder: "Built card #2, “Card 2”",
      explorer: "Thought through “Basket”",
    },
  );
  assert.deepEqual(koboldsLast(null, [], en), {});
});

test("every line is written in all three languages", () => {
  const tags = [
    (m: typeof en) => makerTag({ version: "A", since: START }, at(0), m),
    (m: typeof en) => builderTag(5, null, m),
    (m: typeof en) => builderTag(5, "x", m),
    (m: typeof en) => testerTag({ status: "queued", steps: 0 }, "Mia", m),
    (m: typeof en) => testerTag({ status: "running", steps: 0 }, "Mia", m),
    (m: typeof en) => testerTag({ status: "done", steps: 2 }, "Mia", m),
    (m: typeof en) => sorterTag(2, m),
    (m: typeof en) => sorterTag(0, m),
    (m: typeof en) => makerNow({ version: "A", activity: "x" }, m),
    (m: typeof en) => makerNow({ version: "A", activity: null }, m),
    (m: typeof en) => testerNow(["Mia"], m),
    (m: typeof en) => testerNow(["Mia", "Omar"], m),
    (m: typeof en) => sorterNow(2, m),
    (m: typeof en) => builtLast(work([card(1, "done")]), m),
    (m: typeof en) => exploredLast([{ title: "x" }], m),
  ];
  for (const locale of LOCALES) {
    const words = messagesIn(locale);
    for (const say of tags) {
      const line = say(words);
      assert.ok(line, locale);
      // Every name was filled in, and the key itself never shows.
      assert.doesNotMatch(line, /\{\{|^meet\./, `${locale}: ${line}`);
    }
  }
  // The names and jobs of everybody, in each language.
  for (const locale of LOCALES) {
    const words = messagesIn(locale);
    for (const member of TEAM)
      for (const part of ["roles", "jobs", "where"])
        assert.notEqual(
          words(`meet.${part}.${member.id}` as "meet.roles.maker"),
          `meet.${part}.${member.id}`,
          `${locale} ${part} ${member.id}`,
        );
  }
});

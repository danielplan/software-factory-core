import assert from "node:assert/strict";
import { test } from "node:test";

import type { CardView, WorkView } from "../src/api.ts";
import { loopOf, statusLine, waitingOf } from "../src/lib/home-view.ts";
import { updateRow } from "../src/updates/updates-model.ts";

function card(
  number: number,
  stage: CardView["stage"],
  more: Partial<CardView> = {},
): CardView {
  return {
    number,
    title: `Card ${String(number)}`,
    stage,
    column: "",
    url: `https://github.com/acme/shop/issues/${String(number)}`,
    pullRequest: null,
    closed: false,
    asks: false,
    ...more,
  };
}

function work(cards: CardView[], asking: WorkView["asking"] = []): WorkView {
  return {
    cards,
    problem: null,
    read: "2026-11-19T10:00:00Z",
    builder: {
      on: true,
      working: null,
      also: [],
      activity: null,
      steps: [],
      problem: null,
    },
    coach: { on: false } as WorkView["coach"],
    asking,
  };
}

const row = (id: string, line: string | null, busy: string | null = null) => ({
  id,
  title: `Exploration ${id}`,
  line,
  busy,
});

test("what waits: questions first, then pull requests to review, explorations with a next step, new signals", () => {
  const waiting = waitingOf({
    work: work(
      [
        card(55, "review", {
          pullRequest: "https://github.com/acme/shop/pull/61",
        }),
        card(56, "doing"),
        card(57, "review", { closed: true }),
      ],
      [{ number: 58, title: "Export", url: "", text: "", ask: null }],
    ),
    signals: [{ text: "Export button missing on iPad" }],
    fresh: 3,
    exploring: [
      row("X-1", "Try the prototype"),
      row("X-2", "Busy", "Making a prototype"),
      row("X-3", null),
    ],
  });
  assert.deepEqual(
    waiting.map((item) => [item.kind, item.title, item.href]),
    [
      ["Answer", "Export", "#build"],
      ["Review", "Card 55", "https://github.com/acme/shop/pull/61"],
      ["Continue", "Exploration X-1", "#explore/X-1"],
      ["Sort", "3 new signals", "#signals"],
    ],
  );
  assert.equal(waiting[1]?.outside, true);
  assert.equal(waiting[3]?.about, "Export button missing on iPad");
});

test("nothing waits without work, and a review without a pull request leads to its card", () => {
  assert.deepEqual(
    waitingOf({ work: null, signals: [], fresh: 0, exploring: [] }),
    [],
  );
  const [only] = waitingOf({
    work: work([card(9, "review")]),
    signals: [],
    fresh: 0,
    exploring: [],
  });
  assert.deepEqual(
    [only?.href, only?.about],
    ["https://github.com/acme/shop/issues/9", "Waits for your review"],
  );
  const one = waitingOf({ work: null, signals: [], fresh: 1, exploring: [] });
  assert.equal(one[0]?.title, "1 new signal");
});

test("the loop counts each stage and shows its latest two", () => {
  const loop = loopOf({
    work: work([
      card(1, "todo"),
      card(2, "doing"),
      card(3, "review"),
      card(4, "done"),
      card(5, null, { closed: true }),
    ]),
    signals: [{ text: "a" }, { text: "b" }, { text: "c" }],
    fresh: 3,
    exploring: [row("X-1", null)],
  });
  assert.deepEqual(
    loop.map((stage) => [stage.id, stage.count, stage.says, stage.items]),
    [
      ["signals", 3, "new", ["a", "b"]],
      ["explore", 1, "being explored", ["Exploration X-1"]],
      ["build", 2, "to build · 1 to review", ["Card 3", "Card 1"]],
      ["done", 2, "merged", ["Card 4", "Card 5"]],
    ],
  );
  const empty = loopOf({ work: null, signals: [], fresh: 0, exploring: [] });
  assert.equal(empty[2]?.says, "to build");
});

test("the status line says how the product is and what the builder does", () => {
  const all = { light: "running", running: 2, shown: 2 };
  assert.equal(
    statusLine(all, "#5 Export"),
    "The product is running · Bolt is building #5 Export",
  );
  assert.equal(
    statusLine({ light: "none", running: 0, shown: 0 }, null),
    "No product to run yet · Bolt is resting",
  );
  assert.match(
    statusLine({ ...all, light: "problem" }, null),
    /^Something needs you on System/,
  );
  assert.match(
    statusLine({ ...all, light: "starting" }, null),
    /^Starting the product/,
  );
  assert.match(
    statusLine({ light: "stopped", running: 0, shown: 2 }, null),
    /^The product is stopped/,
  );
  assert.match(
    statusLine({ light: "stopped", running: 1, shown: 2 }, null),
    /^1 of 2 parts are running/,
  );
});

const quiet = {
  byItself: false,
  looking: false,
  updating: false,
  waiting: { count: 0, titles: [] },
  blocked: null,
  offline: false,
  lastLookAt: null,
  lastUpdate: null,
  step: null,
  release: { newest: null, card: null },
};

test("the sidebar's update row shows only when something needs the owner", () => {
  assert.equal(updateRow(quiet), null);
  assert.deepEqual(
    updateRow({
      ...quiet,
      updating: true,
      step: "Installing what the changes need",
    }),
    {
      tone: "busy",
      title: "Updating…",
      text: "Installing what the changes need",
    },
  );
  const ready = { ...quiet, waiting: { count: 3, titles: ["Export as CSV"] } };
  assert.deepEqual(updateRow(ready), {
    tone: "new",
    title: "3 changes ready",
    text: "Export as CSV",
  });
  assert.equal(
    updateRow({
      ...ready,
      blocked: { reason: "2 file(s) were changed by hand", files: [] },
    })?.tone,
    "blocked",
  );
  const release = { ...quiet, release: { newest: "0.12.0", card: null } };
  assert.deepEqual(updateRow(release), {
    tone: "release",
    title: "Kobble 0.12.0 is out",
    text: "Prepare the upgrade for the team",
  });
  assert.equal(
    updateRow({
      ...release,
      release: { newest: "0.12.0", card: { number: 61, url: "" } },
    })?.text,
    "Being prepared in #61",
  );
  const now = Date.parse("2026-11-19T10:05:00Z");
  const updated = {
    ...quiet,
    lastUpdate: { at: "2026-11-19T10:00:00Z", count: 1 },
  };
  assert.equal(updateRow(updated, now)?.title, "Updated");
  assert.equal(updateRow(updated, now + 10 * 60_000), null);
});

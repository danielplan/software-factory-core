import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CardView,
  IdeaView,
  KoboldJob,
  PartView,
  WorkView,
} from "../src/api.ts";
import {
  askPlaceholder,
  countsOf,
  isAskShortcut,
  koboldStatus,
  overallOf,
} from "../src/lib/shell-view.ts";
import { lightOnly, type RuleLike } from "../src/lib/light-only.ts";

// The frame around every page: the sidebar's counts, the kobold's card,
// the factory's light, the Ask field; and the light or dark choice.

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
const work = (more: Partial<WorkView> = {}): WorkView => ({
  cards: [],
  problem: null,
  read: null,
  builder: {
    on: true,
    working: null,
    activity: null,
    steps: [],
    problem: null,
  },
  coach: { on: true, working: null, steps: [] },
  ...more,
});
const job = (more: Partial<KoboldJob>): KoboldJob => ({
  id: "j",
  kind: "sort",
  about: "s1",
  made: null,
  working: false,
  activity: null,
  done: null,
  problem: null,
  ...more,
});
const part = (light: PartView["light"]) => ({ light }) as PartView;

test("the sidebar counts only what there is: explorations, tickets not in the app", () => {
  assert.deepEqual(countsOf(0, null), {});
  assert.deepEqual(
    countsOf(
      2,
      work({ cards: [card(1, "todo"), card(2, "done"), card(3, null)] }),
    ),
    { explore: 2, build: 2 },
  );
  assert.deepEqual(countsOf(0, work({ cards: [card(2, "done")] })), {});
});

test("the factory's light, in words", () => {
  assert.deepEqual(overallOf([]), { lit: "stopped", words: "0 of 0 running" });
  assert.deepEqual(overallOf([part("running"), part("none")]), {
    lit: "running",
    words: "All running",
  });
  assert.deepEqual(overallOf([part("running"), part("stopped")]), {
    lit: "stopped",
    words: "1 of 2 running",
  });
  assert.equal(overallOf([part("starting"), part("running")]).lit, "starting");
  assert.equal(overallOf([part("starting"), part("problem")]).lit, "problem");
});

test("the kobold's card says what it works on, or that it rests", () => {
  const thinking = { title: "Wish list", working: true } as IdeaView;
  assert.deepEqual(koboldStatus([], null, [], "All running"), {
    busy: false,
    title: "Kobold is resting",
    detail: "All quiet · All running",
  });
  assert.deepEqual(
    koboldStatus(
      [job({ working: true, activity: "Reading the records" })],
      work({
        builder: {
          on: true,
          working: { number: 7, title: "Order status", what: "building" },
          activity: null,
          steps: [],
          problem: null,
        },
      }),
      [thinking],
      "",
    ),
    { busy: true, title: "Kobold is building", detail: "Order status" },
  );
  assert.deepEqual(
    koboldStatus(
      [job({ working: false }), job({ kind: "answer", working: true })],
      null,
      [thinking],
      "",
    ),
    {
      busy: true,
      title: "Kobold is answering your question",
      detail: "Working…",
    },
  );
  assert.equal(
    koboldStatus([job({ working: true, activity: "Sorting" })], null, [], "")
      .detail,
    "Sorting",
  );
  assert.deepEqual(koboldStatus([], null, [thinking], ""), {
    busy: true,
    title: "Kobold is thinking",
    detail: "Wish list",
  });
  assert.deepEqual(
    koboldStatus(
      [],
      work({ coach: { on: true, working: 12, steps: [] } }),
      [],
      "",
    ),
    { busy: true, title: "Kobold is planning", detail: "Card #12" },
  );
});

test("the Ask field names the product, and ⌘K or Ctrl+K goes to it", () => {
  assert.equal(askPlaceholder("Shop"), "Ask about the people who use Shop…");
  assert.equal(
    askPlaceholder(undefined),
    "Ask about the people who use this product…",
  );
  const key = (key: string, metaKey: boolean, ctrlKey = false) => ({
    key,
    metaKey,
    ctrlKey,
  });
  assert.equal(isAskShortcut(key("k", true)), true);
  assert.equal(isAskShortcut(key("K", false, true)), true);
  assert.equal(isAskShortcut(key("k", false)), false);
  assert.equal(isAskShortcut(key("j", true)), false);
});

test("light only: every rule for a computer set to dark is switched off", () => {
  const media = (mediaText: string, cssRules: RuleLike[] = []): RuleLike => ({
    cssText: "",
    media: { mediaText },
    cssRules,
  });
  const nested = media("(prefers-color-scheme:dark)");
  const dark = media("(prefers-color-scheme: dark)");
  const wide = media("(min-width: 768px)");
  const layer: RuleLike = { cssText: "@layer utilities", cssRules: [nested] };
  const plain: RuleLike = { cssText: ":root {}" };
  const foreign = {
    get cssRules(): RuleLike[] {
      throw new Error("A style sheet from elsewhere cannot be read.");
    },
  };
  lightOnly([{ cssRules: [plain, dark, wide, layer] }, foreign]);
  assert.deepEqual(
    [dark, nested, wide].map((rule) => rule.media?.mediaText),
    ["not all", "not all", "(min-width: 768px)"],
  );
});

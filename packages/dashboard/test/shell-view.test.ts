import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CardView,
  IdeaRow,
  IdeaView,
  KoboldJob,
  PartView,
  SignalView,
  WorkView,
} from "../src/api.ts";
import { countsOf, koboldStatus, overallOf } from "../src/lib/shell-view.ts";
import {
  applyChoice,
  choiceOf,
  keepChoice,
  mediaFor,
  type RuleLike,
  storedChoice,
} from "../src/lib/theme-choice.ts";

// The frame around every page: the sidebar's counts, the kobold's card,
// the factory's light, the Ask field; and the light or dark choice.

const row = (state: IdeaRow["state"]): IdeaRow => ({
  id: state,
  title: state,
  persona: null,
  state,
  stage: "versions",
  versions: 0,
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

test("the sidebar counts only what there is: ideas exploring, tickets not in the app", () => {
  assert.deepEqual(countsOf(null, null), {});
  assert.deepEqual(
    countsOf(
      [row("exploring"), row("exploring"), row("inBuild"), row("worked")],
      work({ cards: [card(1, "todo"), card(2, "done"), card(3, null)] }),
    ),
    { explore: 2, build: 2 },
  );
  assert.deepEqual(
    countsOf([row("didntWork")], work({ cards: [card(2, "done")] })),
    {},
  );
  // What people said that nobody has looked at, on Signals.
  assert.deepEqual(
    countsOf(null, null, {
      toLookAt: [{} as SignalView, {} as SignalView],
      newStories: [{ id: "st", title: "", persona: "" }],
    }),
    { signals: 3 },
  );
  assert.deepEqual(countsOf(null, null, { toLookAt: [], newStories: [] }), {});
});

test("the factory's light, in words", () => {
  assert.deepEqual(overallOf([]), { lit: "stopped", words: "0 of 0 running" });
  assert.deepEqual(overallOf([part("running"), part("none")]), {
    lit: "running",
    words: "Everything is running",
  });
  assert.deepEqual(overallOf([part("running"), part("stopped")]), {
    lit: "stopped",
    words: "1 of 2 running",
  });
  assert.equal(overallOf([part("starting"), part("running")]).lit, "starting");
  assert.equal(overallOf([part("starting"), part("problem")]).lit, "problem");
});

test("the bottom of the sidebar says whether the kobold is active, and on what", () => {
  const thinking = { title: "Wish list", working: true } as IdeaView;
  assert.deepEqual(koboldStatus([], null, [], "Everything is running"), {
    busy: false,
    title: "Not active",
    detail: "Everything is running",
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
    { busy: true, title: "Active", detail: "Building: Order status" },
  );
  assert.equal(
    koboldStatus(
      [job({ working: false }), job({ kind: "answer", working: true })],
      null,
      [thinking],
      "",
    ).detail,
    "Answering a question",
  );
  assert.equal(
    koboldStatus([job({ working: true, activity: "Mia" })], null, [], "")
      .detail,
    "Sorting what came in: Mia",
  );
  assert.equal(
    koboldStatus([], null, [thinking], "").detail,
    "Thinking about Wish list",
  );
  assert.equal(
    koboldStatus(
      [],
      work({ coach: { on: true, working: 12, steps: [] } }),
      [],
      "",
    ).detail,
    "Planning card #12",
  );
});

test("light or dark: System unless light or dark was kept, and a browser that keeps nothing is fine", () => {
  assert.equal(choiceOf("dark"), "dark");
  assert.equal(choiceOf("light"), "light");
  assert.equal(choiceOf("purple"), "system");
  assert.equal(choiceOf(null), "system");

  const kept = new Map<string, string>();
  const storage = {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => {
      kept.set(key, value);
    },
  };
  assert.equal(
    storedChoice(() => storage),
    "system",
  );
  assert.equal(
    keepChoice(() => storage, "dark"),
    true,
  );
  assert.equal(
    storedChoice(() => storage),
    "dark",
  );

  const blocked = () => {
    throw new Error("The storage is blocked.");
  };
  assert.equal(storedChoice(blocked), "system");
  assert.equal(keepChoice(blocked, "light"), false);
});

test("a choice turns the dark rules on or off where they are, and System gives them back", () => {
  assert.equal(mediaFor("dark", "(prefers-color-scheme: dark)"), "all");
  assert.equal(mediaFor("light", "(prefers-color-scheme: dark)"), "not all");
  assert.equal(
    mediaFor("system", "(prefers-color-scheme: dark)"),
    "(prefers-color-scheme: dark)",
  );

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
  const sheets = [{ cssRules: [plain, dark, wide, layer] }, foreign];

  applyChoice(sheets, "dark");
  assert.deepEqual(
    [dark, nested, wide].map((rule) => rule.media?.mediaText),
    ["all", "all", "(min-width: 768px)"],
  );
  applyChoice(sheets, "light");
  assert.equal(dark.media?.mediaText, "not all");
  applyChoice(sheets, "system");
  assert.deepEqual(
    [dark, nested].map((rule) => rule.media?.mediaText),
    ["(prefers-color-scheme: dark)", "(prefers-color-scheme:dark)"],
  );
});

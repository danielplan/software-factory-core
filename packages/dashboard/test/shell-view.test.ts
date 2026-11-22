import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CardView,
  IdeaView,
  PartView,
  WorkView,
} from "../src/api/client.ts";
import { countsOf, koboldStatus, overallOf } from "../src/lib/shell-view.ts";
import { lightOnly, type RuleLike } from "../src/lib/light-only.ts";

// The frame around every page: the sidebar's counts, the kobold's card,
// the factory's light; and light only.

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
    also: [],
    activity: null,
    steps: [],
    problem: null,
  },
  coach: { on: true, working: null, also: [], steps: [] },
  ...more,
});
const part = (light: PartView["light"]) => ({ light }) as PartView;

test("the sidebar counts only what there is: explorations, tickets not in the app", () => {
  assert.deepEqual(countsOf(0, null), {});
  assert.deepEqual(
    countsOf(
      2,
      work({
        cards: [
          card(1, "todo"),
          card(2, "done"),
          card(3, null),
          card(4, "backlog"),
          card(5, "review"),
        ],
      }),
    ),
    // Ideas (Backlog, no column) are not the factory's work.
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
  assert.deepEqual(koboldStatus(null, [], "All running"), {
    busy: false,
    title: "Kobold is resting",
    detail: "All quiet · All running",
  });
  assert.deepEqual(
    koboldStatus(
      work({
        builder: {
          on: true,
          working: {
            number: 7,
            title: "Order status",
            what: "building",
            activity: null,
            steps: [],
          },
          also: [],
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
  assert.deepEqual(koboldStatus(null, [thinking], ""), {
    busy: true,
    title: "Kobold is thinking",
    detail: "Wish list",
  });
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

test("the answer sent from a waiting card: the owner's words, else the picked answer", async () => {
  const { answerText } = await import("../src/features/factory/answer-text.ts");
  const waiting = {
    number: 1,
    title: "T",
    url: "",
    text: "?",
    ask: {
      about: "",
      where: "",
      question: "?",
      answers: [{ key: "A", answer: "Yes", means: "" }],
      suggested: null,
    },
  };
  assert.equal(answerText(waiting, "A", ""), "**A**: Yes");
  assert.equal(answerText(waiting, "A", " Mine "), "Mine");
  assert.equal(answerText(waiting, null, ""), "");
});

test("setting up is done only once the kobold has finished, not when the folder exists", async () => {
  const { setUpDone } = await import("../src/features/setup/steps.ts");
  assert.equal(setUpDone({ made: true, working: true }), false);
  assert.equal(setUpDone({ made: false, working: false }), false);
  assert.equal(setUpDone({ made: true, working: false }), true);
});

test("the kobold's card says when it makes a prototype or thinks in an exploration", () => {
  assert.deepEqual(
    koboldStatus(null, [], "All running", [
      { title: "Quiet one", busy: null },
      { title: "Signals from AI testers", busy: "Making prototype A" },
    ]),
    {
      busy: true,
      title: "Kobold is making prototype A",
      detail: "Signals from AI testers",
    },
  );
});

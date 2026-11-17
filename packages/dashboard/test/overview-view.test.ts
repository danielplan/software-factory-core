import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CardView,
  IdeaRow,
  KoboldNews,
  PersonaCard,
  SignalView,
  StoryCard,
  UnderstandOverview,
  WorkView,
} from "../src/api.ts";
import { overviewOf } from "../src/lib/overview-view.ts";
import { problemRows } from "../src/lib/rows.ts";

// Overview: what needs a person, by name; the problems still open and the
// work under way, a few rows of each.

const idea = (id: string, stage: IdeaRow["stage"]): IdeaRow => ({
  id,
  title: id,
  persona: { id: "mia", name: "Mia", at: 0 },
  state: "exploring",
  stage,
  versions: 0,
});
const card = (
  number: number,
  stage: CardView["stage"],
  asks = false,
): CardView => ({
  number,
  title: `Card ${String(number)}`,
  stage,
  column: stage ?? "",
  url: "",
  pullRequest: null,
  closed: false,
  asks,
});
const work = (cards: CardView[]): WorkView => ({
  cards,
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
});
const news = (signals: number): KoboldNews => ({
  toLookAt: Array.from({ length: signals }, () => ({}) as SignalView),
  newStories: [],
});
const story = (id: string, more: Partial<StoryCard>): StoryCard =>
  ({
    id,
    title: `Story ${id}`,
    problemTitle: `Problem ${id}`,
    stage: "heard",
    isNew: false,
    wrong: null,
    ...more,
  }) as StoryCard;
const persona = (name: string, stories: StoryCard[]): PersonaCard =>
  ({
    persona: { id: name.toLowerCase(), name },
    stories,
  }) as unknown as PersonaCard;
const understand = (
  personas: PersonaCard[],
  signals = 0,
): UnderstandOverview => ({ personas, kobold: news(signals) });

test("nothing yet: nothing needs you and both lists are empty", () => {
  const view = overviewOf(null, null, null);
  assert.deepEqual(view.needs, []);
  assert.deepEqual(view.problems, { rows: [], more: 0 });
  assert.deepEqual(view.work, { rows: [], more: 0 });
});

test("what needs you comes by name, the most pressing first", () => {
  const view = overviewOf(
    understand([], 3),
    [idea("Wish list", "versions"), idea("Reminder", "picked")],
    work([card(1, "review"), card(2, "done", true), card(3, "doing")]),
  );
  assert.deepEqual(
    view.needs.map((need) => [need.action, need.about]),
    [
      ["Did it work?", "Card 2"],
      ["Check the work", "Card 1"],
      ["Send to the Factory", "Reminder"],
      ["Vote for a version", "Wish list"],
      ["Have a look", "3 new signals"],
    ],
  );
  assert.equal(view.needs[2]?.href, "#explore/Reminder");
  assert.equal(view.needs[4]?.href, "#signals");
  // Each has its own id, so two cards with the same title stay apart.
  assert.deepEqual(
    view.needs.map((need) => need.id),
    ["card-2", "card-1", "idea-Reminder", "idea-Wish list", "signals"],
  );
});

test("what waits elsewhere is counted and always shows: serious findings first, the rest after the named ones", () => {
  const view = overviewOf(
    {
      personas: [],
      kobold: { ...news(2), newStories: [{ id: "s", title: "", persona: "" }] },
    },
    [idea("Wish list", "versions"), idea("Reminder", "picked")],
    work([card(1, "review"), card(2, "done", true)]),
    {
      findings: [
        { severity: "low" },
        { severity: "high" },
        { severity: "medium" },
      ],
      fixes: 1,
    },
  );
  assert.deepEqual(
    view.needs.map((need) => [need.about, need.href]),
    [
      ["1 serious problem the Check-up found", "#checks"],
      ["1 fix waiting for a ticket", "#build"],
      ["2 new signals", "#signals"],
      ["1 new story from the kobold", "#understand"],
      ["2 things the Check-up found", "#checks"],
    ],
  );
  // Fewer counted ones leave room for the named ones, up to five.
  const some = overviewOf(
    null,
    [idea("Reminder", "picked")],
    work([card(1, "review")]),
    { findings: [{ severity: "high" }], fixes: 0 },
  );
  assert.deepEqual(
    some.needs.map((need) => need.id),
    ["serious", "card-1", "idea-Reminder"],
  );
});

test("Personas' part lists the open problems; the Factory's the cards not done, or the ideas being built without a board", () => {
  const view = overviewOf(
    understand([
      persona("Mia", [
        story("a", { stage: "building" }),
        story("b", { stage: "solved" }),
        story("c", { isNew: true }),
      ]),
    ]),
    [idea("Size finder", "building"), idea("Wish list", "versions")],
    work([card(1, "backlog"), card(2, "done"), card(3, "doing", false)]),
  );
  assert.deepEqual(
    view.problems.rows.map((row) => [row.title, row.status, row.fresh]),
    [
      ["Problem c", "Heard", true],
      ["Problem a", "Building", false],
    ],
  );
  assert.deepEqual(
    view.work.rows.map((row) => row.title),
    ["Card 1", "Card 3"],
  );
  const noBoard = overviewOf(null, [idea("Size finder", "building")], null);
  assert.deepEqual(
    noBoard.work.rows.map((row) => [row.title, row.status, row.who]),
    [["Size finder", "Building", "Mia"]],
  );
});

test("a part shows five rows and says how many more there are", () => {
  const many = Array.from({ length: 7 }, (_, at) => card(at + 1, "todo"));
  const view = overviewOf(null, null, work(many));
  assert.equal(view.work.rows.length, 5);
  assert.equal(view.work.more, 2);
});

test("problems: new first, then those that most need a person; a story that didn't hold last", () => {
  const rows = problemRows([
    persona("Mia", [
      story("solved", { stage: "solved" }),
      story("wrong", { wrong: "Nobody picks up" }),
      story("trying", { stage: "trying" }),
      story("heard", { stage: "heard" }),
      story("new", { stage: "building", isNew: true }),
      story("none", { stage: null, problemTitle: null }),
    ]),
  ]);
  assert.deepEqual(
    rows.map((row) => [row.id, row.status, row.done]),
    [
      ["new", "Building", false],
      ["heard", "Heard", false],
      ["none", "Not clear yet", false],
      ["trying", "Trying ideas", false],
      ["solved", "Solved", true],
      ["wrong", "Didn't hold", true],
    ],
  );
  assert.equal(rows[2]?.title, "Story none");
  assert.equal(rows[0]?.href, "#understand/mia/new");
});

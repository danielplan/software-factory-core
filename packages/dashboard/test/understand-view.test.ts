import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  KoboldNews,
  PersonaCard,
  SignalView,
  StoryCard,
  StoryPage,
} from "../src/api.ts";
import {
  askWords,
  evidenceOf,
  guessedCount,
  koboldLine,
  listWords,
  originWords,
  problemWhy,
  realProblemWords,
  stateOf,
  storiesWords,
  storyFrom,
  tintOf,
  wentWords,
} from "../src/understand/view.ts";

// What the Understand pages say, from what the server sends.

test("a story's pill says where its problem stands, or that it did not hold", () => {
  const pill = (problemState: StoryCard["problemState"]) =>
    stateOf({ problemState, wrong: null }).words;
  assert.equal(pill("open"), "Open");
  assert.equal(pill("beingSolved"), "Being solved");
  assert.equal(pill("solved"), "Solved");
  assert.equal(pill(null), "No problem yet");
  assert.deepEqual(
    stateOf({ problemState: "open", wrong: "Nobody chose it" }),
    {
      words: "Didn't hold",
      tone: "wrong",
    },
  );
});

test("lists, origins and a persona's header read as plain words", () => {
  assert.equal(listWords([]), "");
  assert.equal(listWords(["A"]), "A");
  assert.equal(listWords(["A", "B", "C"]), "A, B and C");
  assert.equal(originWords({ signals: 1 }), "Written from 1 signal");
  assert.equal(originWords({ signals: 3 }), "Written from 3 signals");
  assert.equal(
    originWords({ idea: "i", title: "Wish list", by: "Luca" }),
    "From an idea by Luca",
  );
  assert.equal(
    originWords({ idea: "i", title: "Wish list", by: null }),
    "From the idea “Wish list”",
  );
  const card = {
    realProblems: [],
    summary: { stories: 1, openStories: 1, realProblems: [] },
  } as unknown as PersonaCard;
  assert.equal(realProblemWords(card), "Not clear yet");
  assert.equal(storiesWords(card), "1 story · 1 open");
  assert.equal(
    realProblemWords({
      ...card,
      realProblems: [{ title: "Shopping fits the gaps of a day" }],
    } as unknown as PersonaCard),
    "Shopping fits the gaps of a day",
  );
  assert.equal(
    storiesWords({
      ...card,
      summary: { stories: 3, openStories: 0, realProblems: [] },
    }),
    "3 stories · 0 open",
  );
});

test("where a signal went, with the page that shows it", () => {
  const went = (to: SignalView["went"], sortedAs = "need") =>
    wentWords({ went: to, sortedAs } as SignalView);
  assert.deepEqual(went(null), { words: "Not sorted yet", href: null });
  assert.deepEqual(
    went({ to: "story", story: "st1", persona: "mia", title: "T", scene: 2 }),
    { words: "Scene 2 of “T”", href: "#understand/mia/st1" },
  );
  assert.equal(
    went({ to: "story", story: "st1", persona: "mia", title: "T", scene: null })
      .words,
    "The story “T”",
  );
  assert.deepEqual(
    went({ to: "problem", problem: "find", persona: "mia", title: "Lost" }),
    { words: "The problem “Lost”", href: "#understand/mia" },
  );
  assert.equal(went({ to: "ticket", issue: 140 }).words, "Issue #140");
  assert.equal(went({ to: "build" }, "bug").words, "Build, as a fix");
  assert.equal(went({ to: "build" }, "update").words, "Build, as an update");
  assert.equal(went({ to: "answered" }).words, "Answered");
});

test("the kobold's line says what it did that nobody looked at yet", () => {
  const name = (id: string) => id.toUpperCase();
  const signal = (went: SignalView["went"]) => ({ went }) as SignalView;
  const news = (n: Partial<KoboldNews>): KoboldNews => ({
    newStories: [],
    toLookAt: [],
    ...n,
  });
  assert.equal(koboldLine(news({}), name), null);
  assert.equal(
    koboldLine(
      news({
        newStories: [{ id: "st9", title: "A gift", persona: "ines" }],
        toLookAt: [signal({ to: "answered" }), signal(null)],
      }),
      name,
    ),
    "The kobold wrote a new story for INES: “A gift”. It sorted 1 signal nobody has looked at yet. 1 signal is not sorted yet.",
  );
  assert.equal(
    koboldLine(
      news({
        newStories: [
          { id: "a", title: "A", persona: "x" },
          { id: "b", title: "B", persona: "y" },
        ],
        toLookAt: [signal(null), signal(null), signal({ to: "build" })],
      }),
      name,
    ),
    "The kobold wrote 2 new stories. It sorted 1 signal nobody has looked at yet. 2 signals are not sorted yet.",
  );
});

test("guessed scenes, and the line that asks about them", () => {
  assert.equal(guessedCount([true, false, false]), 2);
  assert.equal(
    askWords(1, "Mia"),
    "1 scene is guessed. Ask two people like Mia?",
  );
  assert.equal(
    askWords(3, "Mia"),
    "3 scenes are guessed. Ask two people like Mia?",
  );
});

test("why a problem stands where it does, from its ideas", () => {
  const page = (
    state: "open" | "beingSolved" | "solved",
    ideas: [string, string][],
  ) =>
    ({
      problem: { id: "p", state },
      ideas: [
        ...ideas.map(([title, s]) => ({ title, state: s, problems: ["p"] })),
        { title: "Elsewhere", state: "exploring", problems: ["q"] },
      ],
    }) as unknown as StoryPage;
  assert.equal(problemWhy(page("solved", [])), "A change for it worked.");
  assert.equal(problemWhy(page("open", [])), "Nobody is working on it yet.");
  assert.equal(
    problemWhy(page("open", [["Pickup", "didntWork"]])),
    "Tried: Pickup, which didn't work.",
  );
  assert.equal(
    problemWhy(
      page("beingSolved", [
        ["Wish list", "exploring"],
        ["Reminder", "exploring"],
      ]),
    ),
    "Being explored in Wish list and Reminder.",
  );
  assert.equal(
    problemWhy(page("beingSolved", [["Status page", "inBuild"]])),
    "In Build: Status page.",
  );
  assert.equal(
    problemWhy(page("beingSolved", [])),
    "A change for it waits for “did it work?”.",
  );
});

test("a story's own page says where it came from", () => {
  const page = (from: StoryPage["story"]["from"]) =>
    ({
      story: { from },
      ideas: [
        {
          id: "wish",
          title: "Wish list",
          origin: { from: "person", name: "Pia" },
        },
        {
          id: "slots",
          title: "Later slots",
          origin: { from: "problem", id: "p" },
        },
      ],
    }) as unknown as StoryPage;
  assert.equal(
    storyFrom(page({ signals: ["s1", "s2"] })),
    "Written from 2 signals",
  );
  assert.equal(storyFrom(page({ idea: "wish" })), "From an idea by Pia");
  assert.equal(
    storyFrom(page({ idea: "slots" })),
    "From the idea “Later slots”",
  );
  assert.equal(storyFrom(page({ idea: "gone" })), "From the idea “gone”");
});

test("a scene's evidence is its first signal, with its source", () => {
  const signals = [
    { id: "s1", sourceName: "Support", text: "Where is it?" },
    { id: "s2", sourceName: "Reviews", text: "Too small." },
  ] as StoryPage["signals"];
  assert.deepEqual(evidenceOf(["s2", "s1"], signals), {
    source: "Support",
    text: "Where is it?",
  });
  assert.equal(evidenceOf([], signals), null);
  assert.equal(tintOf(0), "bg-persona-1");
  assert.equal(tintOf(6), "bg-persona-2");
});

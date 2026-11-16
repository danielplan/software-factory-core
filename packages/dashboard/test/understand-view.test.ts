import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  KoboldNews,
  PersonaCard,
  SignalView,
  StoryPage,
} from "../src/api.ts";
import {
  evidenceOf,
  knownWords,
  koboldLine,
  listWords,
  originWords,
  realProblemWords,
  sentencesOf,
  storiesWords,
  storyFrom,
  tintOf,
  stageWhy,
  wentWords,
} from "../src/understand/view.ts";

// What the Understand pages say, from what the server sends.

test("why a problem is at its stage, in one plain line", () => {
  const why = (
    exploring: string[],
    inBuild: number[],
    answer: StoryPage["answer"] = null,
  ) => ({ trying: { exploring, inBuild }, answer });
  assert.equal(
    stageWhy("heard", why([], [])),
    "Heard from people. No idea for it yet.",
  );
  assert.equal(
    stageWhy("assumed", why([], [])),
    "Assumed from an idea. Nobody has said it yet.",
  );
  assert.equal(
    stageWhy("trying", why(["Wish list", "Evening reminder"], [])),
    "Trying: Wish list, Evening reminder",
  );
  assert.equal(stageWhy("building", why([], [138])), "In Build as #138");
  assert.equal(
    stageWhy("inApp", why([], [131, 144])),
    "In the app as #131 and #144: did it work?",
  );
  const answer = { issue: 127, worked: "yes", by: "Luca", on: "14 Nov" };
  assert.equal(
    stageWhy("solved", why([], [], answer)),
    "Closed by Luca on 14 Nov: it worked",
  );
  assert.equal(
    stageWhy("didntWork", why([], [], { ...answer, worked: "no" })),
    "Closed by Luca on 14 Nov: it didn't work",
  );
  assert.equal(stageWhy("didntWork", why([], [])), "It didn't work");
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

test("how much of a story is seen, in a line", () => {
  assert.equal(knownWords({ seen: 3, of: 4 }), "3 of 4 parts seen · 1 guessed");
  assert.equal(knownWords({ seen: 2, of: 2 }), "2 of 2 parts seen");
});

test("a story is told as sentences, the one it breaks at marked, what they do instead last", () => {
  const scene = (text: string, evidence: string[] = [], breaks = false) => ({
    text,
    where: null,
    evidence,
    breaks,
  });
  const signals = [
    { id: "s1", sourceName: "Support", text: "Where is it?" },
  ] as StoryPage["signals"];
  const told = (instead: string | null) =>
    sentencesOf({
      story: {
        scenes: [
          scene("he opens last week’s order", ["s1"]),
          scene("He types it in again, line by line.", [], true),
        ],
        instead: instead === null ? null : { text: instead, evidence: [] },
      } as unknown as StoryPage["story"],
      signals,
    });
  assert.deepEqual(told("He drives to the wholesaler"), [
    {
      text: "He opens last week’s order.",
      breaks: false,
      evidence: { source: "Support", text: "Where is it?" },
    },
    {
      text: "He types it in again, line by line.",
      breaks: true,
      evidence: null,
    },
    {
      text: "Instead, he drives to the wholesaler.",
      breaks: false,
      evidence: null,
    },
  ]);
  assert.equal(
    told("I call the shop!").at(-1)?.text,
    "Instead, I call the shop!",
  );
  assert.equal(told("SMS the team").at(-1)?.text, "Instead, SMS the team.");
  assert.equal(told(null).length, 2);
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

import assert from "node:assert/strict";
import { test } from "node:test";

import type { SignalView, StoryPage } from "../src/api.ts";
import {
  alreadyOf,
  alreadyWords,
  evidenceOf,
  knownWords,
  listWords,
  originWords,
  sentencesOf,
  storyFrom,
  tintOf,
  stageWhy,
  wentWords,
  saidOf,
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
    "People have said it. No idea for it yet.",
  );
  assert.equal(
    stageWhy("assumed", why([], [])),
    "Guessed from an idea. Nobody has said it yet.",
  );
  assert.equal(
    stageWhy("trying", why(["Wish list", "Evening reminder"], [])),
    "Ideas are being tried for it.",
  );
  assert.equal(stageWhy("building", why([], [138])), "Being built as #138.");
  assert.equal(
    stageWhy("inApp", why([], [131, 144])),
    "In the app as #131 and #144. Did it work?",
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

test("lists, origins and a person's header read as plain words", () => {
  assert.equal(listWords([]), "");
  assert.equal(listWords(["A"]), "A");
  assert.equal(listWords(["A", "B", "C"]), "A, B and C");
  assert.equal(originWords({ signals: 1 }), "From 1 thing people said");
  assert.equal(originWords({ signals: 3 }), "From 3 things people said");
  assert.equal(
    originWords({ idea: "i", title: "Wish list", by: "Luca" }),
    "From an idea by Luca",
  );
  assert.equal(
    originWords({ idea: "i", title: "Wish list", by: null }),
    "From the idea “Wish list”",
  );
});

test("where what people said went, with the page that shows it", () => {
  const went = (to: SignalView["went"], sortedAs = "need") =>
    wentWords({ went: to, sortedAs } as SignalView);
  assert.deepEqual(went(null), { words: "Not placed yet", href: null });
  assert.deepEqual(
    went({ to: "story", story: "st1", persona: "mia", title: "T", scene: 2 }),
    { words: "Step 2 of “T”", href: "#understand/mia/st1" },
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
  assert.equal(
    went({ to: "build" }, "update").words,
    "Build, as an improvement",
  );
  assert.equal(went({ to: "answered" }).words, "Answered");
});

test("how much of a story people confirmed, in a line", () => {
  assert.equal(
    knownWords({ seen: 3, of: 4 }),
    "3 of 4 steps confirmed · 1 guessed",
  );
  assert.equal(knownWords({ seen: 2, of: 2 }), "2 of 2 steps confirmed");
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
      instead: false,
      evidence: { source: "Support", text: "Where is it?" },
    },
    {
      text: "He types it in again, line by line.",
      breaks: true,
      instead: false,
      evidence: null,
    },
    {
      text: "Instead, he drives to the wholesaler.",
      breaks: false,
      instead: true,
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
    "From 2 things people said",
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

test("before choosing, a signal says what already exists for its problem", () => {
  type Existing = SignalView["existing"];
  const of = (existing: Existing) => alreadyOf({ existing });
  const wish = { id: "wish", title: "Wish list" };
  const ticket = (
    issue: number,
    worked: Existing["tickets"][number]["worked"],
    idea: string | null = null,
  ) => ({ issue, idea, worked });
  assert.equal(of({ ideas: [], tickets: [] }), null);
  assert.deepEqual(of({ ideas: [wish], tickets: [] }), {
    kind: "explored",
    idea: wish,
  });
  // An idea already sent to Build is no longer "being explored".
  assert.deepEqual(of({ ideas: [wish], tickets: [ticket(12, null, "wish")] }), {
    kind: "building",
    issue: 12,
  });
  assert.deepEqual(
    of({ ideas: [], tickets: [ticket(12, null), ticket(9, "yes")] }),
    { kind: "fixed", issue: 9 },
  );
  assert.deepEqual(of({ ideas: [], tickets: [ticket(9, "unchecked")] }), {
    kind: "fixed",
    issue: 9,
  });
  // A ticket answered "no" counts for nothing.
  assert.equal(of({ ideas: [], tickets: [ticket(9, "no", "wish")] }), null);
  assert.equal(
    alreadyWords({ kind: "explored", idea: wish }),
    "Already explored in “Wish list”",
  );
  assert.equal(
    alreadyWords({ kind: "building", issue: 12 }),
    "Already in Build as #12",
  );
  assert.equal(
    alreadyWords({ kind: "fixed", issue: 9 }),
    "Already fixed in #9",
  );
});

test("what people like a persona said: from sources of people, newest first", () => {
  const records = {
    sources: [
      { id: "sup", name: "Support", kind: "people" },
      { id: "err", name: "Errors", kind: "errors" },
    ],
    signals: [
      {
        id: "s1",
        source: "sup",
        text: "First",
        when: "Mon",
        soundsLike: "mia",
      },
      { id: "s2", source: "err", text: "Crash", when: "", soundsLike: "mia" },
      { id: "s3", source: "sup", text: "Other", when: "", soundsLike: "noah" },
      {
        id: "s4",
        source: "sup",
        text: "Latest",
        when: "Tue",
        soundsLike: "mia",
      },
    ],
  } as unknown as Parameters<typeof saidOf>[0];
  assert.deepEqual(saidOf(records, "mia"), [
    { id: "s4", text: "Latest", source: "Support", when: "Tue" },
    { id: "s1", text: "First", source: "Support", when: "Mon" },
  ]);
  assert.deepEqual(saidOf(records, "ines"), []);
});

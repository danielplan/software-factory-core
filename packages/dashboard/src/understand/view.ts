// What the Understand pages say, worked out from what the server sends:
// the stage a story's problem is at, and why,
// where a story came from, the story told as sentences, where a signal
// went, the kobold's line on what it did, and how much of a story is seen.
// Kept apart from the components so it is checked on its own.

import type {
  KoboldNews,
  PersonaCard,
  SignalView,
  StoryCard,
  StoryPage,
} from "../api.ts";
import { understandHash } from "../lib/routes.ts";

export type Tone = "open" | "solving" | "solved" | "wrong" | "none";

// The stage a story's problem is at (worked out by the server), as a
// pipeline of five steps: Heard (or Assumed) → Trying ideas → Building →
// In the app → Solved (or Didn't work).
export type Stage = NonNullable<StoryCard["stage"]>;

const STAGE_NAMES: Record<Stage, string> = {
  assumed: "Assumed",
  heard: "Heard",
  trying: "Trying ideas",
  building: "Building",
  inApp: "In the app",
  solved: "Solved",
  didntWork: "Didn't work",
};
const STAGE_AT: Record<Stage, number> = {
  assumed: 0,
  heard: 0,
  trying: 1,
  building: 2,
  inApp: 3,
  solved: 4,
  didntWork: 4,
};

export function stepsOf(stage: Stage): {
  names: string[];
  at: number;
  name: string;
} {
  return {
    names: [
      stage === "assumed" ? "Assumed" : "Heard",
      "Trying ideas",
      "Building",
      "In the app",
      stage === "didntWork" ? "Didn't work" : "Solved",
    ],
    at: STAGE_AT[stage],
    name: STAGE_NAMES[stage],
  };
}

type WhyOf = Pick<StoryPage, "trying" | "answer">;
const issuesOf = (why: WhyOf) =>
  listWords(why.trying.inBuild.map((n) => `#${String(n)}`));
const closed = (why: WhyOf, worked: string) =>
  why.answer
    ? `Closed by ${why.answer.by} on ${why.answer.on}: ${worked}`
    : worked.charAt(0).toUpperCase() + worked.slice(1);
const WHY: Record<Stage, (why: WhyOf) => string> = {
  heard: () => "Heard from people. No idea for it yet.",
  assumed: () => "Assumed from an idea. Nobody has said it yet.",
  trying: (why) => `Trying: ${why.trying.exploring.join(", ")}`,
  building: (why) => `In Build as ${issuesOf(why)}`,
  inApp: (why) => `In the app as ${issuesOf(why)}: did it work?`,
  solved: (why) => closed(why, "it worked"),
  didntWork: (why) => closed(why, "it didn't work"),
};

// Why the problem is at its stage, in one plain line.
export function stageWhy(stage: Stage, why: WhyOf): string {
  return WHY[stage](why);
}

// "A, B and C".
export function listWords(items: string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1) ?? ""}`;
}

function count(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${String(n)} ${many}`;
}

// Where a story came from.
export function originWords(from: StoryCard["from"]): string {
  if ("signals" in from)
    return `Written from ${count(from.signals, "signal", "signals")}`;
  return from.by
    ? `From an idea by ${from.by}`
    : `From the idea “${from.title}”`;
}

// Where the story on its own page came from.
export function storyFrom(page: Pick<StoryPage, "story" | "ideas">): string {
  const { from } = page.story;
  if ("signals" in from) return originWords({ signals: from.signals.length });
  const idea = page.ideas.find((one) => one.id === from.idea);
  return originWords({
    idea: from.idea,
    title: idea?.title ?? from.idea,
    by: idea?.origin.from === "person" ? idea.origin.name : null,
  });
}

// The persona's header: their real problem, and their stories.
export function realProblemWords(card: PersonaCard): string {
  return card.realProblems[0]?.title ?? "Not clear yet";
}

export function storiesWords(card: PersonaCard): string {
  const { stories, openStories } = card.summary;
  return `${count(stories, "story", "stories")} · ${String(openStories)} open`;
}

// Where a signal went, in words, and the page that shows it, if any.
export function wentWords(signal: Pick<SignalView, "went" | "sortedAs">): {
  words: string;
  href: string | null;
} {
  const { went } = signal;
  if (went === null) return { words: "Not sorted yet", href: null };
  if (went.to === "story")
    return {
      words: went.scene
        ? `Scene ${String(went.scene)} of “${went.title}”`
        : `The story “${went.title}”`,
      href: understandHash(went.persona, went.story),
    };
  if (went.to === "problem")
    return {
      words: `The problem “${went.title}”`,
      href: understandHash(went.persona),
    };
  if (went.to === "ticket")
    return { words: `Issue #${String(went.issue)}`, href: null };
  if (went.to === "build")
    return {
      words:
        signal.sortedAs === "update"
          ? "Build, as an update"
          : "Build, as a fix",
      href: null,
    };
  return { words: "Answered", href: null };
}

// The kobold's line at the top of Understand: the stories it started and
// the signals it sorted that nobody has looked at yet; null when there are
// none.
export function koboldLine(
  news: KoboldNews,
  personaName: (id: string) => string,
): string | null {
  const parts: string[] = [];
  const [first] = news.newStories;
  if (news.newStories.length === 1 && first)
    parts.push(
      `The kobold wrote a new story for ${personaName(first.persona)}: “${first.title}”.`,
    );
  else if (news.newStories.length > 1)
    parts.push(
      `The kobold wrote ${String(news.newStories.length)} new stories.`,
    );
  const sorted = news.toLookAt.filter((s) => s.went !== null).length;
  const waiting = news.toLookAt.length - sorted;
  if (sorted > 0)
    parts.push(
      `It sorted ${count(sorted, "signal", "signals")} nobody has looked at yet.`,
    );
  if (waiting > 0)
    parts.push(`${count(waiting, "signal is", "signals are")} not sorted yet.`);
  return parts.length > 0 ? parts.join(" ") : null;
}

// How much of a story is seen, in a line: "3 of 4 parts seen · 1 guessed".
export function knownWords(known: { seen: number; of: number }): string {
  const guessed = known.of - known.seen;
  const seen = `${String(known.seen)} of ${String(known.of)} parts seen`;
  return guessed > 0 ? `${seen} · ${String(guessed)} guessed` : seen;
}

// The story told as sentences, in order: each scene, then what the persona
// does instead, each seen (with what shows it) or guessed, the one it
// breaks at marked.
export type Sentence = {
  text: string;
  breaks: boolean;
  evidence: { source: string; text: string } | null;
};

export function sentencesOf(
  page: Pick<StoryPage, "story" | "signals">,
): Sentence[] {
  const { story, signals } = page;
  const told = story.scenes.map((scene) => ({
    text: sentence(scene.text),
    breaks: scene.breaks,
    evidence: evidenceOf(scene.evidence, signals),
  }));
  if (!story.instead) return told;
  return [
    ...told,
    {
      text: sentence(`Instead, ${lowerFirst(story.instead.text)}`),
      breaks: false,
      evidence: evidenceOf(story.instead.evidence, signals),
    },
  ];
}

// A capital at the start and a full stop at the end.
function sentence(text: string): string {
  const trimmed = text.trim();
  const capital = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(capital) ? capital : `${capital}.`;
}

// After "Instead, ": "He drives" becomes "he drives"; "I" and a word in
// capitals stay as they are.
function lowerFirst(text: string): string {
  const trimmed = text.trim();
  if (/^(I\b|[A-Z]{2})/.test(trimmed)) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

// What shows a scene: the first signal that is its evidence, with its
// source; null when it is guessed.
export function evidenceOf(
  evidence: string[],
  signals: StoryPage["signals"],
): { source: string; text: string } | null {
  const first = signals.find((signal) => evidence.includes(signal.id));
  return first ? { source: first.sourceName, text: first.text } : null;
}

// A soft colour for each persona, by their place on the page.
const TINTS = [
  "bg-persona-1",
  "bg-persona-2",
  "bg-persona-3",
  "bg-persona-4",
  "bg-persona-5",
];

export function tintOf(index: number): string {
  return TINTS[index % TINTS.length] ?? "bg-persona-1";
}

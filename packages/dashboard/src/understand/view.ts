// What the Understand pages say, worked out from what the server sends:
// where a problem stands, where a story came from, where a signal went,
// the kobold's line on what it did, and how many scenes are guessed. Kept
// apart from the components so it is checked on its own.

import type {
  KoboldNews,
  PersonaCard,
  SignalView,
  StoryCard,
  StoryPage,
} from "../api.ts";
import { understandHash } from "../lib/routes.ts";

export type Tone = "open" | "solving" | "solved" | "wrong" | "none";

// The pill on a story: where its problem stands, or that it did not hold.
export function stateOf(card: Pick<StoryCard, "problemState" | "wrong">): {
  words: string;
  tone: Tone;
} {
  if (card.wrong !== null) return { words: "Didn't hold", tone: "wrong" };
  if (card.problemState === "solved")
    return { words: "Solved", tone: "solved" };
  if (card.problemState === "beingSolved")
    return { words: "Being solved", tone: "solving" };
  if (card.problemState === "open") return { words: "Open", tone: "open" };
  return { words: "No problem yet", tone: "none" };
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

// The scenes (and what the persona does instead) nobody has seen yet.
export function guessedCount(seen: boolean[]): number {
  return seen.filter((one) => !one).length;
}

export function askWords(guessed: number, persona: string): string {
  const scenes = guessed === 1 ? "1 scene is" : `${String(guessed)} scenes are`;
  return `${scenes} guessed. Ask two people like ${persona}?`;
}

// Why the problem stands where it does, from the ideas for it.
export function problemWhy(page: StoryPage): string {
  const state = page.problem?.state;
  const ideas = page.ideas.filter(
    (idea) => page.problem && idea.problems.includes(page.problem.id),
  );
  const titled = (wanted: string[]) =>
    listWords(
      ideas.filter((idea) => wanted.includes(idea.state)).map((i) => i.title),
    );
  if (state === "solved") return "A change for it worked.";
  if (state === "open")
    return titled(["didntWork"])
      ? `Tried: ${titled(["didntWork"])}, which didn't work.`
      : "Nobody is working on it yet.";
  const exploring = titled(["exploring"]);
  const building = titled(["inBuild"]);
  if (exploring) return `Being explored in ${exploring}.`;
  if (building) return `In Build: ${building}.`;
  return "A change for it waits for “did it work?”.";
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

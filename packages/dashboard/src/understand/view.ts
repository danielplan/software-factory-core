// What the Understand pages say, worked out from what the server sends:
// the stage a story's problem is at, and why,
// where a story came from, the story told as sentences, where a signal
// went, what people like a persona said, and how much of a story is seen.
// Kept apart from the components so it is checked on its own.

import type { RecordsView, SignalView, StoryCard, StoryPage } from "../api.ts";
import { i18next, t } from "../i18n/i18n.ts";
import { understandHash } from "../lib/routes.ts";

type Records = RecordsView["records"];
import { closedWords } from "../lib/stages.ts";

export type Tone = "open" | "solving" | "solved" | "wrong" | "none";

export type Stage = NonNullable<StoryCard["stage"]>;

type WhyOf = Pick<StoryPage, "trying" | "answer">;
const issuesOf = (why: WhyOf) =>
  listWords(why.trying.inBuild.map((n) => `#${String(n)}`));
const WHY: Record<Stage, (why: WhyOf) => string> = {
  heard: () => t("understand:why.heard"),
  assumed: () => t("understand:why.assumed"),
  trying: () => t("understand:why.trying"),
  building: (why) => t("understand:why.building", { issues: issuesOf(why) }),
  inApp: (why) => t("understand:why.inApp", { issues: issuesOf(why) }),
  solved: (why) => closedWords(why.answer, t("understand:why.worked")),
  didntWork: (why) => closedWords(why.answer, t("understand:why.didntWork")),
};

// Why the problem is at its stage, in one plain line.
export function stageWhy(stage: Stage, why: WhyOf): string {
  return WHY[stage](why);
}

// "A, B and C", in the dashboard's language (the platform's own list
// format; British English, with no comma before "and").
export function listWords(items: string[]): string {
  const language = i18next.language === "en" ? "en-GB" : i18next.language;
  return new Intl.ListFormat(language, { type: "conjunction" }).format(items);
}

// Where a story came from.
export function originWords(from: StoryCard["from"]): string {
  if ("signals" in from)
    return t("understand:origin.said", { count: from.signals });
  return from.by
    ? t("understand:origin.ideaBy", { name: from.by })
    : t("understand:origin.idea", { title: from.title });
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

// Everything people like this persona said (a signal that sounds like them,
// from a source of people, as the server's own list), newest first: what
// was said, where from and when.
export function saidOf(
  records: Pick<Records, "signals" | "sources">,
  persona: string,
): { id: string; text: string; source: string; when: string }[] {
  const people = new Map(
    records.sources
      .filter((source) => source.kind === "people")
      .map((source) => [source.id, source.name]),
  );
  return records.signals
    .filter((signal) => signal.soundsLike === persona)
    .flatMap((signal) => {
      const source = people.get(signal.source);
      return source === undefined
        ? []
        : [{ id: signal.id, text: signal.text, source, when: signal.when }];
    })
    .reverse();
}

// Where a signal went, in words, and the page that shows it, if any.
export function wentWords(signal: Pick<SignalView, "went" | "sortedAs">): {
  words: string;
  href: string | null;
} {
  const { went } = signal;
  if (went === null) return { words: t("understand:went.notYet"), href: null };
  if (went.to === "story")
    return {
      words: went.scene
        ? t("understand:went.step", { step: went.scene, title: went.title })
        : t("understand:went.story", { title: went.title }),
      href: understandHash(went.persona, went.story),
    };
  if (went.to === "problem")
    return {
      words: t("understand:went.problem", { title: went.title }),
      href: understandHash(went.persona),
    };
  if (went.to === "ticket")
    return {
      words: t("understand:went.issue", { issue: went.issue }),
      href: null,
    };
  if (went.to === "build")
    return {
      words:
        signal.sortedAs === "update"
          ? t("understand:went.update")
          : t("understand:went.fix"),
      href: null,
    };
  return { words: t("understand:went.answered"), href: null };
}

// How much of a story people confirmed, in a line: "3 of 4 steps
// confirmed · 1 guessed".
export function knownWords(known: { seen: number; of: number }): string {
  const guessed = known.of - known.seen;
  const words = { seen: known.seen, of: known.of, guessed };
  return guessed > 0
    ? t("understand:known.guessed", words)
    : t("understand:known.seen", words);
}

// The story told as sentences, in order: each scene, then what the persona
// does instead (marked), each seen (with what shows it) or guessed, the one
// it breaks at marked.
export type Sentence = {
  text: string;
  breaks: boolean;
  instead: boolean;
  evidence: { source: string; text: string } | null;
};

export function sentencesOf(
  page: Pick<StoryPage, "story" | "signals">,
): Sentence[] {
  const { story, signals } = page;
  const told = story.scenes.map((scene) => ({
    text: sentence(scene.text),
    breaks: scene.breaks,
    instead: false,
    evidence: evidenceOf(scene.evidence, signals),
  }));
  if (!story.instead) return told;
  return [
    ...told,
    {
      text: sentence(
        t("understand:instead", { text: lowerFirst(story.instead.text) }),
      ),
      breaks: false,
      instead: true,
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

// What already exists for the problem a signal is about, the furthest
// along first: a ticket that worked or is in the app ("did it work?"
// answered yes, or not checked), then one being built (not answered), then
// an idea being explored (with no ticket yet). A ticket answered no counts
// for nothing. Null when there is none.
export type Already =
  | { kind: "fixed" | "building"; issue: number }
  | { kind: "explored"; idea: { id: string; title: string } };

export function alreadyOf(
  signal: Pick<SignalView, "existing">,
): Already | null {
  const { ideas, tickets } = signal.existing;
  const fixed = tickets.find(
    (t) => t.worked === "yes" || t.worked === "unchecked",
  );
  if (fixed) return { kind: "fixed", issue: fixed.issue };
  const building = tickets.find((t) => t.worked === null);
  if (building) return { kind: "building", issue: building.issue };
  const sent = new Set(tickets.map((t) => t.idea));
  const explored = ideas.find((idea) => !sent.has(idea.id));
  return explored ? { kind: "explored", idea: explored } : null;
}

// The words for what already exists.
export function alreadyWords(already: Already): string {
  if (already.kind === "explored")
    return t("understand:signal.already.explored", {
      title: already.idea.title,
    });
  return t(`understand:signal.already.${already.kind}`, {
    issue: already.issue,
  });
}

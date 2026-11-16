// What the Understand pages show, from the records and what is worked out
// from them (derive): the overview (every persona with their stories), one
// persona, and one story with its evidence. The web interface imports these
// types only.

import {
  type Customer,
  derive,
  type Derived,
  type Idea,
  type IdeaState,
  type Known,
  type Persona,
  type PersonaSummary,
  type Problem,
  type ProblemState,
  type RealProblem,
  type Records,
  type Signal,
  signalsBehind,
  type Story,
} from "@software-factory/core";

import { Refused } from "../refused.ts";
import {
  type KoboldNews,
  koboldNews,
  saidBy,
  type SignalView,
} from "./signal-views.ts";

// GET /api/records: everything, with what is worked out from it.
export type RecordsView = { records: Records; derived: Derived };

export type StoryCard = {
  id: string;
  title: string;
  persona: string;
  starts: string;
  wants: string;
  problem: string | null;
  problemTitle: string | null;
  problemState: ProblemState | null;
  known: Known;
  // Each scene, then what the persona does instead: seen (true) or guessed.
  seen: boolean[];
  ended: boolean;
  isNew: boolean;
  // Why it turned out wrong; null while it holds.
  wrong: string | null;
  // Written from signals (how many), or from an idea (its title, and the
  // team member who had it, if a person did).
  from:
    { signals: number } | { idea: string; title: string; by: string | null };
};

export type PersonaCard = {
  persona: Persona;
  summary: PersonaSummary;
  realProblems: RealProblem[];
  stories: StoryCard[];
};

// GET /api/understand: the personas, and what the kobold did that no person
// has looked at yet.
export type UnderstandOverview = {
  personas: PersonaCard[];
  kobold: KoboldNews;
};

// GET /api/understand/persona?id=<persona>
export type PersonaPage = PersonaCard & {
  customers: Customer[];
  // What people like them said, newest first.
  said: SignalView[];
  // Each problem with where it stands and the signals behind it.
  problems: (Problem & { state: ProblemState; signals: string[] })[];
};

// GET /api/understand/story?id=<story>
export type StoryPage = {
  story: Story;
  known: Known;
  ended: boolean;
  persona: Persona;
  problem: (Problem & { state: ProblemState }) | null;
  realProblem: RealProblem | null;
  // The other problems the real problem sits behind.
  alsoBehind: { id: string; title: string }[];
  // Every signal the story names, or that went to it, with its source's name.
  signals: (Signal & { sourceName: string })[];
  // The ideas for its problem, and the idea it was written from.
  ideas: (Idea & { state: IdeaState })[];
};

export function recordsView(records: Records): RecordsView {
  return { records, derived: derive(records) };
}

export function overview(records: Records): UnderstandOverview {
  const derived = derive(records);
  return {
    personas: records.personas.map((p) => personaCard(p, records, derived)),
    kobold: koboldNews(records),
  };
}

export function personaPage(records: Records, id: string): PersonaPage {
  const persona = found(records.personas, id, "persona");
  const derived = derive(records);
  return {
    ...personaCard(persona, records, derived),
    customers: records.customers.filter((c) => c.persona === id),
    said: saidBy(records, id),
    problems: records.problems
      .filter((p) => p.persona === id)
      .map((p) => ({
        ...p,
        state: derived.problems[p.id] ?? "open",
        signals: signalsBehind(records, p.id).map((s) => s.id),
      })),
  };
}

export function storyPage(records: Records, id: string): StoryPage {
  const story = found(records.stories, id, "story");
  const derived = derive(records);
  const problem = records.problems.find((p) => p.id === story.problem) ?? null;
  const fromIdea = "idea" in story.from ? story.from.idea : null;
  const realProblem =
    records.realProblems.find((r) => r.id === problem?.realProblem) ?? null;
  return {
    story,
    known: derived.stories[id]?.known ?? { seen: 0, of: 0 },
    ended: derived.stories[id]?.ended ?? false,
    persona: found(records.personas, story.persona, "persona"),
    problem: problem && {
      ...problem,
      state: derived.problems[problem.id] ?? "open",
    },
    realProblem,
    alsoBehind: records.problems
      .filter((p) => realProblem && p.realProblem === realProblem.id)
      .filter((p) => p.id !== problem?.id)
      .map((p) => ({ id: p.id, title: p.title })),
    signals: signalsOf(story, records),
    ideas: records.ideas
      .filter(
        (idea) =>
          idea.id === fromIdea ||
          (problem !== null && idea.problems.includes(problem.id)),
      )
      .map((idea) => ({
        ...idea,
        state: derived.ideas[idea.id] ?? "exploring",
      })),
  };
}

function personaCard(
  persona: Persona,
  records: Records,
  derived: Derived,
): PersonaCard {
  return {
    persona,
    summary: derived.personas[persona.id] ?? {
      stories: 0,
      openStories: 0,
      realProblems: [],
    },
    realProblems: records.realProblems.filter((r) => r.persona === persona.id),
    stories: records.stories
      .filter((s) => s.persona === persona.id)
      .map((s) => storyCard(s, records, derived)),
  };
}

function storyCard(
  story: Story,
  records: Records,
  derived: Derived,
): StoryCard {
  const state = derived.stories[story.id];
  const parts = [...story.scenes, ...(story.instead ? [story.instead] : [])];
  return {
    id: story.id,
    title: story.title,
    persona: story.persona,
    starts: story.starts,
    wants: story.wants,
    problem: story.problem,
    problemTitle:
      records.problems.find((p) => p.id === story.problem)?.title ?? null,
    problemState: story.problem
      ? (derived.problems[story.problem] ?? null)
      : null,
    known: state?.known ?? { seen: 0, of: 0 },
    seen: parts.map((part) => part.evidence.length > 0),
    ended: state?.ended ?? false,
    isNew: story.isNew,
    wrong: story.wrong,
    from: origin(story, records),
  };
}

function origin(story: Story, records: Records): StoryCard["from"] {
  if ("signals" in story.from) return { signals: story.from.signals.length };
  const id = story.from.idea;
  const idea = records.ideas.find((i) => i.id === id);
  return {
    idea: id,
    title: idea?.title ?? id,
    by: idea?.origin.from === "person" ? idea.origin.name : null,
  };
}

function signalsOf(story: Story, records: Records) {
  const named = new Set([
    ...("signals" in story.from ? story.from.signals : []),
    ...story.scenes.flatMap((scene) => scene.evidence),
    ...(story.instead?.evidence ?? []),
  ]);
  const sources = new Map(records.sources.map((s) => [s.id, s.name]));
  return records.signals
    .filter(
      (s) =>
        named.has(s.id) ||
        (s.wentTo?.to === "story" && s.wentTo.id === story.id),
    )
    .map((s) => ({ ...s, sourceName: sources.get(s.source) ?? s.source }));
}

function found<T extends { id: string }>(list: T[], id: string, what: string) {
  const record = list.find((one) => one.id === id);
  if (!record) throw new Refused(`There is no ${what} “${id}”.`);
  return record;
}

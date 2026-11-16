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
  type ProblemStage,
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
  // The stage its problem is at (derive's stages); none without one.
  stage: ProblemStage | null;
  // What is being tried for its problem.
  trying: Trying;
};

// What is being tried for a problem: the ideas for it still being
// explored, by title, and the issues for it in Build, waiting for "did it
// work?".
export type Trying = { exploring: string[]; inBuild: number[] };

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
  // Every signal the story names, or that went to it, with its source's name.
  signals: (Signal & { sourceName: string })[];
  // The ideas for its problem, and the idea it was written from.
  ideas: (Idea & { state: IdeaState })[];
  stage: ProblemStage | null;
  trying: Trying;
  // The last answer to "did it work?" for its problem, if any.
  answer: { issue: number; worked: string; by: string; on: string } | null;
};

export function recordsView(records: Records): RecordsView {
  return { records, derived: derive(records) };
}

// The issues a connected board shows closed or in its last column (in the
// app), for the stage of their problems.
export function issuesInApp(
  cards: readonly { number: number; closed: boolean; stage: string | null }[],
): ReadonlySet<number> {
  return new Set(
    cards
      .filter((card) => card.closed || card.stage === "done")
      .map((card) => card.number),
  );
}

// inApp: the issues the connected board shows closed or in the app.
export function overview(
  records: Records,
  inApp: ReadonlySet<number> = new Set(),
): UnderstandOverview {
  const derived = derive(records, inApp);
  return {
    personas: records.personas.map((p) => personaCard(p, records, derived)),
    kobold: koboldNews(records),
  };
}

export function personaPage(
  records: Records,
  id: string,
  inApp: ReadonlySet<number> = new Set(),
): PersonaPage {
  const persona = found(records.personas, id, "persona");
  const derived = derive(records, inApp);
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

export function storyPage(
  records: Records,
  id: string,
  inApp: ReadonlySet<number> = new Set(),
): StoryPage {
  const story = found(records.stories, id, "story");
  const derived = derive(records, inApp);
  const problem = records.problems.find((p) => p.id === story.problem) ?? null;
  const fromIdea = "idea" in story.from ? story.from.idea : null;
  return {
    story,
    known: derived.stories[id]?.known ?? { seen: 0, of: 0 },
    ended: derived.stories[id]?.ended ?? false,
    persona: found(records.personas, story.persona, "persona"),
    problem: problem && {
      ...problem,
      state: derived.problems[problem.id] ?? "open",
    },
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
    stage: story.problem ? (derived.stages[story.problem] ?? null) : null,
    trying: tryingFor(story.problem, records, derived),
    answer: answerFor(story.problem, records),
  };
}

function answerFor(
  problem: string | null,
  records: Records,
): StoryPage["answer"] {
  const issues = new Set(
    records.ticketLinks
      .filter((t) => problem !== null && t.problems.includes(problem))
      .map((t) => t.issue),
  );
  const last = records.outcomes.filter((o) => issues.has(o.issue)).at(-1);
  return last
    ? { issue: last.issue, worked: last.worked, by: last.by, on: last.on }
    : null;
}

function tryingFor(
  problem: string | null,
  records: Records,
  derived: Derived,
): Trying {
  if (problem === null) return { exploring: [], inBuild: [] };
  const answered = new Map(records.outcomes.map((o) => [o.issue, o.worked]));
  return {
    exploring: records.ideas
      .filter((idea) => idea.problems.includes(problem))
      .filter((idea) => derived.ideas[idea.id] === "exploring")
      .map((idea) => idea.title),
    inBuild: records.ticketLinks
      .filter((ticket) => ticket.problems.includes(problem))
      .filter(
        (ticket) => !["yes", "no"].includes(answered.get(ticket.issue) ?? ""),
      )
      .map((ticket) => ticket.issue),
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
    stage: story.problem ? (derived.stages[story.problem] ?? null) : null,
    trying: tryingFor(story.problem, records, derived),
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

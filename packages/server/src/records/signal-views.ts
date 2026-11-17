// Signals as the Understand pages show them: with the names of their
// source, customer and persona, and where they went (a scene of a story, a
// problem, Build). Also what the kobold did that no person has looked at
// yet, and what people like a persona said.

import { KOBOLD, type Records, type Signal } from "@software-factory/core";

import { Refused } from "../refused.ts";

export type Went =
  | {
      to: "story";
      story: string;
      persona: string;
      title: string;
      // The scene it is evidence in, from 1; null when in none.
      scene: number | null;
    }
  | { to: "problem"; problem: string; persona: string; title: string }
  | { to: "ticket"; issue: number }
  | { to: "build" }
  | { to: "answered" };

// What already exists for the problem a signal is about (through its
// story, or the problem itself): the ideas for it and the tickets for it,
// each with its "did it work?" answer when there is one. Empty when it is
// about no problem.
export type Existing = {
  ideas: { id: string; title: string }[];
  tickets: {
    issue: number;
    idea: string | null;
    worked: "yes" | "no" | "unchecked" | null;
  }[];
};

export type SignalView = Signal & {
  sourceName: string;
  whoName: string | null;
  soundsLikeName: string | null;
  // Null while it is not sorted.
  went: Went | null;
  existing: Existing;
};

// What the kobold did that a person has not looked at yet: the stories it
// started, and the signals it sorted, newest first.
export type KoboldNews = {
  newStories: { id: string; title: string; persona: string }[];
  toLookAt: SignalView[];
};

// GET /api/understand/signal?id=
export function signalView(records: Records, id: string): SignalView {
  const signal = records.signals.find((s) => s.id === id);
  if (!signal) throw new Refused(`There is no signal “${id}”.`);
  return viewOf(signal, records);
}

export function koboldNews(records: Records): KoboldNews {
  return {
    newStories: records.stories
      .filter((s) => s.isNew && s.wrong === null)
      .map((s) => ({ id: s.id, title: s.title, persona: s.persona })),
    toLookAt: records.signals
      .filter((s) => s.by === KOBOLD)
      .reverse()
      .map((s) => viewOf(s, records)),
  };
}

// What people like the persona said (not usage, errors or persona runs),
// newest first.
export function saidBy(records: Records, persona: string): SignalView[] {
  const people = new Set(
    records.sources.filter((s) => s.kind === "people").map((s) => s.id),
  );
  return records.signals
    .filter((s) => s.soundsLike === persona && people.has(s.source))
    .reverse()
    .slice(0, 5)
    .map((s) => viewOf(s, records));
}

function viewOf(signal: Signal, records: Records): SignalView {
  const name = (list: { id: string; name: string }[], id: string | null) =>
    list.find((one) => one.id === id)?.name ?? null;
  return {
    ...signal,
    sourceName: name(records.sources, signal.source) ?? signal.source,
    whoName: name(records.customers, signal.who),
    soundsLikeName: name(records.personas, signal.soundsLike),
    went: wentOf(signal, records),
    existing: existingFor(problemOf(signal, records), records),
  };
}

// The problem a signal is about: its story's, or the problem it went to.
function problemOf(signal: Signal, records: Records): string | null {
  const to = signal.wentTo;
  if (to?.to === "problem") return to.id;
  if (to?.to !== "story") return null;
  return records.stories.find((s) => s.id === to.id)?.problem ?? null;
}

function existingFor(problem: string | null, records: Records): Existing {
  if (problem === null) return { ideas: [], tickets: [] };
  const answers = new Map(records.outcomes.map((o) => [o.issue, o.worked]));
  return {
    ideas: records.ideas
      .filter((idea) => idea.problems.includes(problem))
      .map(({ id, title }) => ({ id, title })),
    tickets: records.ticketLinks
      .filter((ticket) => ticket.problems.includes(problem))
      .map((ticket) => ({
        issue: ticket.issue,
        idea: "idea" in ticket.from ? ticket.from.idea : null,
        worked: answers.get(ticket.issue) ?? null,
      })),
  };
}

function wentOf(signal: Signal, records: Records): Went | null {
  const to = signal.wentTo;
  if (to === null) return null;
  if (to.to === "story") return toStory(signal.id, to.id, records);
  if (to.to === "problem") {
    const problem = records.problems.find((p) => p.id === to.id);
    return {
      to: "problem",
      problem: to.id,
      persona: problem?.persona ?? "",
      title: problem?.title ?? to.id,
    };
  }
  return to.to === "ticket" ? { to: "ticket", issue: to.issue } : { to: to.to };
}

function toStory(signal: string, id: string, records: Records): Went {
  const story = records.stories.find((s) => s.id === id);
  const at = story?.scenes.findIndex((s) => s.evidence.includes(signal)) ?? -1;
  return {
    to: "story",
    story: id,
    persona: story?.persona ?? "",
    title: story?.title ?? id,
    scene: at === -1 ? null : at + 1,
  };
}

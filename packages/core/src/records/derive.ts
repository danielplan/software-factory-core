// What is worked out from the records, never stored: where each problem and
// idea stands, how well each story is known, and a summary of each persona.
//
// - An idea is being explored until a version of it is sent to Build (a
//   ticket); it is in Build while a ticket waits for "did it work?" (or the
//   answer was "didn't check"); it worked when a ticket's answer was yes, and
//   did not when every answer was no.
// - A problem is solved when a ticket for it worked; it is being solved while
//   an idea for it is explored or in Build, or a ticket for it waits for its
//   answer; otherwise it is open.
// - A problem is at a stage, from heard to solved, and an idea from its
//   first version to worked (stage.ts).
// - A story is known as well as the share of its scenes (and what the persona
//   does instead) that have evidence; it ends when its problem is solved.

import type { Outcome, Records, Story, TicketLink } from "./schemas.ts";
import {
  type IdeaStage,
  ideaStage,
  type ProblemStage,
  problemStage,
} from "./stage.ts";

export type IdeaState = "exploring" | "inBuild" | "worked" | "didntWork";
export type ProblemState = "open" | "beingSolved" | "solved";
// Seen scenes out of all of them, "instead" included.
export type Known = { seen: number; of: number };
export type StoryState = { known: Known; ended: boolean };
export type PersonaSummary = {
  // Stories that are not marked wrong, and those of them not ended.
  stories: number;
  openStories: number;
  realProblems: string[];
};

export type Derived = {
  ideas: Record<string, IdeaState>;
  problems: Record<string, ProblemState>;
  stages: Record<string, ProblemStage>;
  ideaStages: Record<string, IdeaStage>;
  stories: Record<string, StoryState>;
  personas: Record<string, PersonaSummary>;
};

// inApp: the issues the connected board shows closed or in the app, when
// it is known.
export function derive(
  records: Records,
  inApp: ReadonlySet<number> = new Set(),
): Derived {
  const answers = new Map(records.outcomes.map((o) => [o.issue, o]));
  const ideas = Object.fromEntries(
    records.ideas.map((idea) => [
      idea.id,
      ideaState(
        records.ticketLinks.filter(
          (t) => "idea" in t.from && t.from.idea === idea.id,
        ),
        answers,
      ),
    ]),
  );
  const problems = Object.fromEntries(
    records.problems.map((problem) => [
      problem.id,
      problemState(problem.id, records, ideas, answers),
    ]),
  );
  const stories = Object.fromEntries(
    records.stories.map((story) => [
      story.id,
      {
        known: howWellKnown(story),
        ended: story.problem !== null && problems[story.problem] === "solved",
      },
    ]),
  );
  const stages = Object.fromEntries(
    records.problems.map((problem) => [
      problem.id,
      problemStage(problem, records, ideas, inApp),
    ]),
  );
  const ideaStages = Object.fromEntries(
    records.ideas.map((idea) => [idea.id, ideaStage(idea, records, inApp)]),
  );
  return {
    ideas,
    problems,
    stages,
    ideaStages,
    stories,
    personas: summaries(records, stories),
  };
}

type Answers = Map<number, Outcome>;

function ideaState(tickets: TicketLink[], answers: Answers): IdeaState {
  if (tickets.length === 0) return "exploring";
  const worked = tickets.map((t) => answers.get(t.issue)?.worked);
  if (worked.includes("yes")) return "worked";
  return worked.every((answer) => answer === "no") ? "didntWork" : "inBuild";
}

function problemState(
  problem: string,
  records: Records,
  ideas: Record<string, IdeaState>,
  answers: Answers,
): ProblemState {
  const tickets = records.ticketLinks.filter((t) =>
    t.problems.includes(problem),
  );
  const worked = tickets.map((t) => answers.get(t.issue)?.worked);
  if (worked.includes("yes")) return "solved";
  const waiting = worked.some((answer) => answer !== "no");
  const tried = records.ideas.some(
    (idea) =>
      idea.problems.includes(problem) &&
      ["exploring", "inBuild"].includes(ideas[idea.id] ?? ""),
  );
  return waiting || tried ? "beingSolved" : "open";
}

export function howWellKnown(story: Story): Known {
  const parts = [...story.scenes, ...(story.instead ? [story.instead] : [])];
  return {
    seen: parts.filter((part) => part.evidence.length > 0).length,
    of: parts.length,
  };
}

function summaries(
  records: Records,
  stories: Record<string, StoryState>,
): Record<string, PersonaSummary> {
  return Object.fromEntries(
    records.personas.map((persona) => {
      const told = records.stories.filter(
        (s) => s.persona === persona.id && s.wrong === null,
      );
      return [
        persona.id,
        {
          stories: told.length,
          openStories: told.filter((s) => !stories[s.id]?.ended).length,
          realProblems: records.realProblems
            .filter((r) => r.persona === persona.id)
            .map((r) => r.id),
        },
      ];
    }),
  );
}

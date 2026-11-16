// One stage vocabulary for Understand, Explore and Build, shown as a small
// pipeline (components/stage-steps.tsx). The stages themselves are worked
// out in the core (derive); this says their steps, names and colour.
//
// - A problem: Heard (or Assumed) → Trying ideas → Building → In the app →
//   Solved, or Didn't work.
// - An idea: Idea → Versions → Picked → Building → In the app → Worked, or
//   Didn't work.
// - A ticket on Build: the end of an idea's pipeline, Building → In the app
//   → Worked, or Didn't work.

import type { IdeaRow, StoryCard } from "../api.ts";

export type ProblemStage = NonNullable<StoryCard["stage"]>;
export type IdeaStage = IdeaRow["stage"];

// The current step's colour: a first step neutral, work under way amber,
// in the app blue, worked green, didn't work pink.
export type StepTone = "neutral" | "amber" | "blue" | "green" | "pink";

export type Steps = {
  names: string[];
  at: number;
  name: string;
  tone: StepTone;
};

const PROBLEM: Record<ProblemStage, [at: number, name: string, StepTone]> = {
  assumed: [0, "Assumed", "neutral"],
  heard: [0, "Heard", "neutral"],
  trying: [1, "Trying ideas", "amber"],
  building: [2, "Building", "amber"],
  inApp: [3, "In the app", "blue"],
  solved: [4, "Solved", "green"],
  didntWork: [4, "Didn't work", "pink"],
};

const IDEA: Record<IdeaStage, [at: number, name: string, StepTone]> = {
  idea: [0, "Idea", "neutral"],
  versions: [1, "Versions", "amber"],
  picked: [2, "Picked", "amber"],
  building: [3, "Building", "amber"],
  inApp: [4, "In the app", "blue"],
  worked: [5, "Worked", "green"],
  didntWork: [5, "Didn't work", "pink"],
};

export function problemSteps(stage: ProblemStage): Steps {
  const [at, name, tone] = PROBLEM[stage];
  return {
    names: [
      stage === "assumed" ? "Assumed" : "Heard",
      "Trying ideas",
      "Building",
      "In the app",
      stage === "didntWork" ? "Didn't work" : "Solved",
    ],
    at,
    name,
    tone,
  };
}

export function ideaSteps(stage: IdeaStage): Steps {
  const [at, name, tone] = IDEA[stage];
  return {
    names: [
      "Idea",
      "Versions",
      "Picked",
      "Building",
      "In the app",
      stage === "didntWork" ? "Didn't work" : "Worked",
    ],
    at,
    name,
    tone,
  };
}

// A ticket's part of the idea's pipeline: from Building on.
export function ticketSteps(stage: IdeaStage): Steps {
  const whole = ideaSteps(stage);
  const from = 3;
  return {
    ...whole,
    names: whole.names.slice(from),
    at: Math.max(whole.at - from, 0),
  };
}

// "Closed by Luca on 14 Nov: it worked", from the last answer to "did it
// work?"; just what happened when nobody's answer is known.
export function closedWords(
  answer: { by: string; on: string } | null,
  happened: string,
): string {
  return answer
    ? `Closed by ${answer.by} on ${answer.on}: ${happened}`
    : happened.charAt(0).toUpperCase() + happened.slice(1);
}

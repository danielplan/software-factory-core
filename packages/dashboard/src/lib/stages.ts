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
import { t } from "../i18n/i18n.ts";

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

// Each stage's step (from 0), the key of its name, and its colour.
type Key =
  | "assumed"
  | "heard"
  | "trying"
  | "building"
  | "inApp"
  | "solved"
  | "didntWork"
  | "idea"
  | "versions"
  | "picked"
  | "worked";
const name = (key: Key) => t(`common:stage.${key}`);

const PROBLEM: Record<ProblemStage, [at: number, StepTone]> = {
  assumed: [0, "neutral"],
  heard: [0, "neutral"],
  trying: [1, "amber"],
  building: [2, "amber"],
  inApp: [3, "blue"],
  solved: [4, "green"],
  didntWork: [4, "pink"],
};

const IDEA: Record<IdeaStage, [at: number, StepTone]> = {
  idea: [0, "neutral"],
  versions: [1, "amber"],
  picked: [2, "amber"],
  building: [3, "amber"],
  inApp: [4, "blue"],
  worked: [5, "green"],
  didntWork: [5, "pink"],
};

export function problemSteps(stage: ProblemStage): Steps {
  const [at, tone] = PROBLEM[stage];
  const keys: Key[] = [
    stage === "assumed" ? "assumed" : "heard",
    "trying",
    "building",
    "inApp",
    stage === "didntWork" ? "didntWork" : "solved",
  ];
  return { names: keys.map(name), at, name: name(stage), tone };
}

export function ideaSteps(stage: IdeaStage): Steps {
  const [at, tone] = IDEA[stage];
  const keys: Key[] = [
    "idea",
    "versions",
    "picked",
    "building",
    "inApp",
    stage === "didntWork" ? "didntWork" : "worked",
  ];
  return { names: keys.map(name), at, name: name(stage), tone };
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
// work?"; just what happened when nobody's answer is known. What happened
// comes already in the person's language.
export function closedWords(
  answer: { by: string; on: string } | null,
  happened: string,
): string {
  return answer
    ? t("common:closedBy", { by: answer.by, on: answer.on, what: happened })
    : happened.charAt(0).toUpperCase() + happened.slice(1);
}

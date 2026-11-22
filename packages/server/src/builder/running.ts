// The board work as the Factory page shows it: the jobs under way, each
// with what it does and its last steps, and a question just asked on a
// stuck card, shown at once while the builder reads the work to answer.

import type { StuckView } from "../api.ts";
import { Refused } from "../refused.ts";
import type { Job } from "./decide.ts";

// A job on a card, at its lane's place (its working copy).
export type Running = {
  job: Job;
  title: string;
  steps: string[];
  place: number;
};
export const STEPS = 40;
const WHAT: Record<Job["kind"], string> = {
  build: "building",
  feedback: "answering the review of",
  reply: "answering your question on",
};

export function workingOf(one: Running) {
  return {
    number: one.job.number,
    title: one.title,
    what: WHAT[one.job.kind],
    activity: one.steps.at(-1) ?? null,
    steps: [...one.steps],
  };
}

// The stuck cards with the owner's new question on one of them; refused
// when that card is not stuck.
export function withQuestion(
  stuck: StuckView[],
  number: number,
  text: string,
  now: Date,
): StuckView[] {
  if (!stuck.some((one) => one.number === number))
    throw new Refused(`#${String(number)} is not stuck.`);
  const at = now.toISOString();
  return stuck.map((one) =>
    one.number === number
      ? {
          ...one,
          talk: [...one.talk, { by: "owner", text, at }],
          answering: true,
        }
      : one,
  );
}

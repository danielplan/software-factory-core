// When the board's reading card shows and where each of its steps is. The
// steps follow what the explorer reports (`talk.step`, from the server),
// never the clock.

import type { ExplorationPage } from "@/api/client";

// The steps, in the order the explorer reaches them.
export const STEPS = ["page", "code", "draw"] as const;

export type StepState = "done" | "active" | "stopped" | "waiting";

// Whether the card shows: an empty board, while the explorer answers or
// once it stopped.
export function readsTheBoard(page: ExplorationPage): boolean {
  return (
    page.board.things.length === 0 &&
    page.exploration.status !== "waiting" &&
    (page.talk.writing !== null || page.talk.problem !== null)
  );
}

// Each step ticked off, being worked on, where it stopped, or still to come.
export function stepStates(
  talk: Pick<ExplorationPage["talk"], "step" | "problem">,
): StepState[] {
  return STEPS.map((_, at) => {
    if (at < talk.step) return "done";
    if (at > talk.step) return "waiting";
    return talk.problem === null ? "active" : "stopped";
  });
}

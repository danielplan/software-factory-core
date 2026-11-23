// The guided setup's steps: a welcome while Sprocket reads, one step per
// area of the setup map (setup coach's areas), and setting up at the end.
// "Bring over" shows only when Sprocket found something to bring.

import type { Draft } from "../../api/schemas/coach.ts";
import { SETUP_AREAS } from "../../../../server/src/api.ts";

export type Step = {
  id: string;
  name: string;
  // The map's area the step shows; none for the welcome and setting up.
  area: string | null;
};

const ALL: Step[] = [
  { id: "hello", name: "Welcome", area: null },
  {
    id: "product",
    name: "Your product",
    area: SETUP_AREAS.product,
  },
  {
    id: "people",
    name: "Who it’s for",
    area: SETUP_AREAS.people,
  },
  {
    id: "team",
    name: "Team and board",
    area: SETUP_AREAS.team,
  },
  {
    id: "how",
    name: "How Kobble works",
    area: SETUP_AREAS.how,
  },
  {
    id: "bring",
    name: "Bring over",
    area: SETUP_AREAS.bring,
  },
  { id: "setup", name: "Set up", area: null },
  {
    id: "start",
    name: "First exploration",
    area: SETUP_AREAS.start,
  },
];

export function stepsOf(draft: Draft): Step[] {
  return ALL.filter(
    (step) =>
      step.id !== "bring" ||
      draft.cards.some((card) => card.area === SETUP_AREAS.bring),
  );
}

export function cardsIn(draft: Draft, area: string | null) {
  return area ? draft.cards.filter((card) => card.area === area) : [];
}

// Kobble is set up: the factory is written and the kobold has finished
// (the folder exists from the first moment of setting up).
export function setUpDone(coach: { made: boolean; working: boolean }): boolean {
  return coach.made && !coach.working;
}

// What Sprocket does while it works, in plain words (the words'
// setup.status): reading the project, setting Kobble up, or changing the
// cards after an answer; null while it waits.
export function statusOf(coach: {
  working: boolean;
  phase: "plan" | "build";
  draft: Draft;
}): "reading" | "building" | "changing" | null {
  if (!coach.working) return null;
  if (coach.phase === "build") return "building";
  return coach.draft.cards.length === 0 ? "reading" : "changing";
}

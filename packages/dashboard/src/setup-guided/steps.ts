// The guided setup's steps: a welcome while the kobold reads, one step per
// area of the setup map (setup coach's areas), and setting up at the end.
// "Bring over" shows only when the kobold found something to bring.

import { type Draft, SETUP_AREAS } from "../../../server/src/api.ts";

export type Step = {
  id: string;
  name: string;
  hint: string;
  // The map's area the step shows; none for the welcome and setting up.
  area: string | null;
};

const ALL: Step[] = [
  { id: "hello", name: "Welcome", hint: "The kobold reads", area: null },
  {
    id: "product",
    name: "Your product",
    hint: "What it is, how far",
    area: SETUP_AREAS.product,
  },
  {
    id: "people",
    name: "Who it’s for",
    hint: "The people you build for",
    area: SETUP_AREAS.people,
  },
  {
    id: "team",
    name: "Team and board",
    hint: "Who works on it, where",
    area: SETUP_AREAS.team,
  },
  {
    id: "how",
    name: "How Kobble works",
    hint: "Add-ons, the look",
    area: SETUP_AREAS.how,
  },
  {
    id: "bring",
    name: "Bring over",
    hint: "What you have already",
    area: SETUP_AREAS.bring,
  },
  { id: "setup", name: "Set up", hint: "Kobble writes it all", area: null },
  {
    id: "start",
    name: "First exploration",
    hint: "Start with real work",
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

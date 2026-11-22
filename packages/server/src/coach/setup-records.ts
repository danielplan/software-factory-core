// What setup leaves in Kobble's records when the factory opens: the people
// drawn in "Who it's for" become personas (each with a kobold that fits what
// it does), and the starting points in "Where to start" become explorations
// waiting to be started. Ones already there (by name or title) are skipped.
// Each goes through its extension's plug: none is made while Personas, or
// Explorations, is not installed.

import { type Draft, SETUP_AREAS } from "../api.ts";
import type { IdeasPlug } from "../plugs/ideas.ts";
import type { PersonasPlug } from "../plugs/personas.ts";

export function recordsFromSetup(
  map: Pick<Draft, "cards">,
  plugs: { personas: PersonasPlug | null; ideas: IdeasPlug | null },
): { personas: number; explorations: number } {
  const cardsIn = (area: string) =>
    map.cards.filter((card) => card.area === area && card.tone !== "question");
  return {
    personas: plugs.personas ? personasFrom(plugs.personas, cardsIn) : 0,
    explorations: plugs.ideas ? ideasFrom(plugs.ideas, cardsIn) : 0,
  };
}

type CardsIn = (area: string) => Draft["cards"];

function personasFrom(personas: PersonasPlug, cardsIn: CardsIn): number {
  const names = new Set(personas.all().map((p) => p.name.toLowerCase()));
  let added = 0;
  for (const card of cardsIn(SETUP_AREAS.people)) {
    if (names.has(card.title.toLowerCase())) continue;
    personas.add({ name: card.title, about: card.text ?? "" });
    added++;
  }
  return added;
}

function ideasFrom(ideas: IdeasPlug, cardsIn: CardsIn): number {
  const titles = new Set(ideas.all().map((x) => x.title.toLowerCase()));
  let added = 0;
  for (const card of cardsIn(SETUP_AREAS.start)) {
    if (titles.has(card.title.toLowerCase())) continue;
    ideas.take({ title: card.title, problem: card.text ?? card.title });
    added++;
  }
  return added;
}

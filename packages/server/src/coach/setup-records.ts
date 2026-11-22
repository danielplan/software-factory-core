// What setup leaves in Kobble's records when the factory opens: the people
// drawn in "Who it's for" become personas (each with a kobold that fits what
// it does), and the starting points in "Where to start" become explorations
// waiting to be started. Ones already there (by name or title) are skipped.

import { KobbleStore } from "@software-factory/core";

import { type Draft, SETUP_AREAS } from "../api.ts";
import { addPersona } from "../extensions/signals/actions.ts";
import { newExploration } from "../extensions/explorations/actions.ts";

export function recordsFromSetup(
  root: string,
  map: Pick<Draft, "cards">,
): { personas: number; explorations: number } {
  const store = new KobbleStore(root);
  const cardsIn = (area: string) =>
    map.cards.filter((card) => card.area === area && card.tone !== "question");
  const names = new Set(store.all("personas").map((p) => p.name.toLowerCase()));
  let personas = 0;
  for (const card of cardsIn(SETUP_AREAS.people)) {
    if (names.has(card.title.toLowerCase())) continue;
    addPersona(store, { name: card.title, about: card.text ?? "" });
    personas++;
  }
  const titles = new Set(
    store.all("explorations").map((x) => x.title.toLowerCase()),
  );
  let explorations = 0;
  for (const card of cardsIn(SETUP_AREAS.start)) {
    if (titles.has(card.title.toLowerCase())) continue;
    newExploration(store, {
      title: card.title,
      problem: card.text ?? card.title,
    });
    explorations++;
  }
  return { personas, explorations };
}

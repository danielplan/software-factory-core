// The plugs Kobble's own extensions offer, made from one factory's records
// as the app makes them, for tests that call one piece directly. Missions
// cannot be started here, and a prototype has no address.

import type { KobbleStore } from "@software-factory/core";

import { ideasOffer } from "../src/extensions/explorations/ideas.ts";
import {
  missionsOffer,
  personasOffer,
} from "../src/extensions/personas/index.ts";
import { signalsOffer } from "../src/extensions/signals/index.ts";

export function plugsOf(store: KobbleStore) {
  const records = () => store;
  const personas = personasOffer(records);
  const ideas = ideasOffer({
    store: records,
    personas: () => personas,
    prototype: () => Promise.reject(new Error("No prototype runs here.")),
  });
  const signals = signalsOffer(records, () => ideas);
  const missions = missionsOffer(records, {
    start: () => {
      throw new Error("No mission starts here.");
    },
  });
  return { personas, ideas, signals, missions };
}

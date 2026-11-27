// What the Personas pages show, worked out from the personas, with the
// signals from each (Signals' plug: none while Signals is not installed).

import {
  type Face,
  faceOf,
  type KobblePersona,
  type KobbleSignal,
  type KobbleStore,
} from "@software-factory/core";

import {
  newestFirst,
  type SignalRow,
  signalRows,
} from "../../kobble/signal-rows.ts";
import { Refused } from "../../refused.ts";

// A persona always has a face here: its own, or the one from its id.
type WithFace = KobblePersona & { face: Face };

export type PersonaRow = WithFace & { signals: number };

export type PersonaPage = {
  persona: WithFace;
  signals: SignalRow[];
};

export function personasView(
  store: KobbleStore,
  signals: KobbleSignal[],
): { personas: PersonaRow[] } {
  return {
    personas: store.all("personas").map((persona) => ({
      ...persona,
      face: faceOf(persona),
      signals: signals.filter((signal) => signal.persona === persona.id).length,
    })),
  };
}

// One persona and every signal from them, whatever became of it.
export function personaPage(
  store: KobbleStore,
  id: string,
  signals: KobbleSignal[],
): PersonaPage {
  const persona = store.get("personas", id);
  if (!persona) throw new Refused(`There is no persona “${id}”.`);
  const theirs = signals.filter((signal) => signal.persona === persona.id);
  return {
    persona: { ...persona, face: faceOf(persona) },
    signals: signalRows(newestFirst(theirs), [persona]),
  };
}

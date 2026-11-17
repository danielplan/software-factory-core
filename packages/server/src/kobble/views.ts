// What the Signals and Personas pages show, worked out from the records.

import {
  type Face,
  faceOf,
  type KobblePersona,
  type KobbleSignal,
  type KobbleStore,
} from "@software-factory/core";

import { Refused } from "../refused.ts";
import type { SyncView } from "./sync.ts";

// A signal with the name and face of its persona, when it has one.
export type SignalRow = KobbleSignal & {
  personaName: string | null;
  personaFace: Face | null;
};

export type SignalsView = {
  // The new signals, newest first.
  signals: SignalRow[];
  counts: { new: number };
  sync: SyncView;
};

// A persona always has a face here: its own, or the one from its id.
type WithFace = KobblePersona & { face: Face };

export type PersonaRow = WithFace & { signals: number };

export type PersonaPage = { persona: WithFace; signals: SignalRow[] };

export function signalsView(store: KobbleStore, sync: SyncView): SignalsView {
  const fresh = newestFirst(
    store.all("signals").filter((signal) => signal.status === "new"),
  );
  return {
    signals: withNames(fresh, store.all("personas")),
    counts: { new: fresh.length },
    sync,
  };
}

export function personasView(store: KobbleStore): { personas: PersonaRow[] } {
  const signals = store.all("signals");
  return {
    personas: store.all("personas").map((persona) => ({
      ...persona,
      face: faceOf(persona),
      signals: signals.filter((signal) => signal.persona === persona.id).length,
    })),
  };
}

// One persona and every signal from them, whatever became of it.
export function personaPage(store: KobbleStore, id: string): PersonaPage {
  const persona = store.get("personas", id);
  if (!persona) throw new Refused(`There is no persona “${id}”.`);
  const theirs = store
    .all("signals")
    .filter((signal) => signal.persona === persona.id);
  return {
    persona: { ...persona, face: faceOf(persona) },
    signals: withNames(newestFirst(theirs), [persona]),
  };
}

function newestFirst(signals: KobbleSignal[]): KobbleSignal[] {
  return [...signals].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id.localeCompare(a.id),
  );
}

function withNames(
  signals: KobbleSignal[],
  personas: KobblePersona[],
): SignalRow[] {
  const byId = new Map(personas.map((one) => [one.id, one]));
  return signals.map((signal) => {
    const persona = signal.persona ? byId.get(signal.persona) : undefined;
    return {
      ...signal,
      personaName: persona?.name ?? null,
      personaFace: persona ? faceOf(persona) : null,
    };
  });
}

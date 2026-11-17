// What the Signals and Personas pages show, worked out from the records.

import type {
  KobblePersona,
  KobbleSignal,
  KobbleStore,
} from "@software-factory/core";

import { Refused } from "../refused.ts";
import type { SyncView } from "./sync.ts";

// A signal with the name of its persona, when it has one.
export type SignalRow = KobbleSignal & { personaName: string | null };

export type SignalsView = {
  // The new signals, newest first.
  signals: SignalRow[];
  counts: { new: number };
  sync: SyncView;
};

export type PersonaRow = KobblePersona & { signals: number };

export type PersonaPage = { persona: KobblePersona; signals: SignalRow[] };

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
  return { persona, signals: withNames(newestFirst(theirs), [persona]) };
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
  const names = new Map(personas.map((one) => [one.id, one.name]));
  return signals.map((signal) => ({
    ...signal,
    personaName: signal.persona ? (names.get(signal.persona) ?? null) : null,
  }));
}

// Signals as Kobble's pages show them, with the name and face of the
// persona each is from: the Signals page (Signals) and a persona's page
// (Personas) both show them so.

import {
  type Face,
  faceOf,
  type KobblePersona,
  type KobbleSignal,
} from "@software-factory/core";

// A signal with the name and face of its persona, when it has one.
export type SignalRow = KobbleSignal & {
  personaName: string | null;
  personaFace: Face | null;
  // The column of the work it was already fixed in, when the board shows it.
  workColumn?: string | null;
};

export function newestFirst(signals: KobbleSignal[]): KobbleSignal[] {
  return [...signals].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id.localeCompare(a.id),
  );
}

// Signals with their persona's name and face.
export function signalRows(
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

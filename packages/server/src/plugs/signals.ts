// The `signals` plug, offered by Signals: the signals there are, and new
// ones reported (a mission's findings, the feedback board's posts). Used by
// Personas, the feedback board and the Factory's page.

import type { KobbleSignal } from "@software-factory/core";

// A signal as it is reported: its id and its "already" check come when it
// is kept.
export type NewSignal = Omit<KobbleSignal, "id" | "already">;

export type SignalsPlug = {
  // Every signal, in the order of their ids.
  all: () => KobbleSignal[];
  get: (id: string) => KobbleSignal | null;
  // New signals, kept in this order, each through the "already" check; as
  // kept.
  report: (signals: NewSignal[]) => KobbleSignal[];
  // A signal changed (the persona it is from), as kept.
  change: (signal: KobbleSignal) => KobbleSignal;
};

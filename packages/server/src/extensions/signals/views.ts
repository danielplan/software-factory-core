// What the Signals page shows, worked out from the signals, with the
// personas' names and faces (Personas' plug), the missions going on
// (Personas' too) and the column a fix is in (the Factory's).

import type { KobblePersona, KobbleStore } from "@software-factory/core";

import {
  newestFirst,
  type SignalRow,
  signalRows,
} from "../../kobble/signal-rows.ts";
import type { MissionNow } from "../../plugs/missions.ts";
import type { SyncView } from "./sync.ts";

export type SignalsView = {
  // The new signals, newest first.
  signals: SignalRow[];
  counts: { new: number };
  sync: SyncView;
  // The missions running or waiting.
  missions: MissionNow[];
};

// What the page shows beside the signals, from the other extensions: none
// of it while they are not installed.
export type Around = {
  personas: KobblePersona[];
  missions: MissionNow[];
  // The column of an issue ("#41") on the board, in words.
  column: (issue: string) => string | null;
};

export function signalsView(
  store: KobbleStore,
  sync: SyncView,
  around: Around,
): SignalsView {
  const fresh = newestFirst(
    store.all("signals").filter((signal) => signal.status === "new"),
  );
  return {
    signals: signalRows(fresh, around.personas).map((row) => ({
      ...row,
      workColumn:
        row.already?.kind === "work" ? around.column(row.already.id) : null,
    })),
    counts: { new: fresh.length },
    sync,
    missions: around.missions,
  };
}

// The signals already handled, the last first: what became of each.
export function handledView(
  store: KobbleStore,
  personas: KobblePersona[],
): { signals: SignalRow[] } {
  const handled = store
    .all("signals")
    .filter((signal) => signal.status !== "new");
  return { signals: signalRows(newestFirst(handled), personas) };
}

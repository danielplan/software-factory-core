// What the Signals and Personas pages show, worked out from the records.

import {
  type Face,
  faceOf,
  type KobblePersona,
  type KobbleSignal,
  type KobbleStore,
  type PersonaTest,
} from "@software-factory/core";

import type { WorkView } from "../../api.ts";
import { Refused } from "../../refused.ts";
import { columnOf } from "../factory/factory-view.ts";
import type { SyncView } from "./sync.ts";

// A signal with the name and face of its persona, when it has one.
export type SignalRow = KobbleSignal & {
  personaName: string | null;
  personaFace: Face | null;
  // The column of the work it was already fixed in, when the board shows it.
  workColumn?: string | null;
};

// A persona on a mission now (or waiting for its turn), and the step it is
// on.
export type MissionNow = {
  id: string;
  persona: string;
  name: string;
  face: Face;
  status: PersonaTest["status"];
  doing: string | null;
};

export type SignalsView = {
  // The new signals, newest first.
  signals: SignalRow[];
  counts: { new: number };
  sync: SyncView;
  // The missions running or waiting.
  missions: MissionNow[];
};

// A persona always has a face here: its own, or the one from its id.
type WithFace = KobblePersona & { face: Face };

export type PersonaRow = WithFace & { signals: number; onMission: boolean };

export type PersonaPage = {
  persona: WithFace;
  signals: SignalRow[];
  tests: PersonaTest[];
};

export type TestPage = {
  test: PersonaTest;
  persona: WithFace;
  signals: SignalRow[];
};

export function signalsView(
  store: KobbleStore,
  sync: SyncView,
  work: WorkView | null,
): SignalsView {
  const fresh = newestFirst(
    store.all("signals").filter((signal) => signal.status === "new"),
  );
  return {
    signals: signalRows(fresh, store.all("personas")).map((row) => ({
      ...row,
      workColumn:
        row.already?.kind === "work" ? columnOf(row.already.id, work) : null,
    })),
    counts: { new: fresh.length },
    sync,
    missions: missionsNow(store),
  };
}

const going = (test: PersonaTest) =>
  test.status === "queued" || test.status === "running";

export function missionsNow(store: KobbleStore): MissionNow[] {
  const personas = new Map(store.all("personas").map((one) => [one.id, one]));
  return store
    .all("tests")
    .filter(going)
    .flatMap((test) => {
      const persona = personas.get(test.persona);
      if (!persona) return [];
      return [
        {
          id: test.id,
          persona: persona.id,
          name: persona.name,
          face: faceOf(persona),
          status: test.status,
          doing: test.doing ?? null,
        },
      ];
    });
}

// The signals already handled, the last first: what became of each.
export function handledView(store: KobbleStore): { signals: SignalRow[] } {
  const handled = store
    .all("signals")
    .filter((signal) => signal.status !== "new");
  return { signals: signalRows(newestFirst(handled), store.all("personas")) };
}

export function personasView(store: KobbleStore): { personas: PersonaRow[] } {
  const signals = store.all("signals");
  const busy = new Set(missionsNow(store).map((one) => one.persona));
  return {
    personas: store.all("personas").map((persona) => ({
      ...persona,
      face: faceOf(persona),
      signals: signals.filter((signal) => signal.persona === persona.id).length,
      onMission: busy.has(persona.id),
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
    signals: signalRows(newestFirst(theirs), [persona]),
    tests: testsOf(store, persona.id),
  };
}

// A persona's tests, the last one first.
export function testsOf(store: KobbleStore, persona: string): PersonaTest[] {
  return store
    .all("tests")
    .filter((test) => test.persona === persona)
    .reverse();
}

// One test, its persona, and the signals it filed.
export function testPage(store: KobbleStore, id: string): TestPage {
  const test = store.get("tests", id);
  if (!test) throw new Refused(`There is no test “${id}”.`);
  const persona = store.get("personas", test.persona);
  if (!persona) throw new Refused(`There is no persona “${test.persona}”.`);
  const filed = store
    .all("signals")
    .filter((signal) => test.signals.includes(signal.id));
  return {
    test,
    persona: { ...persona, face: faceOf(persona) },
    signals: signalRows(filed, [persona]),
  };
}

function newestFirst(signals: KobbleSignal[]): KobbleSignal[] {
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

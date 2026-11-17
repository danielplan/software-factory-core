// Events from the live app becoming signals: each event at most once (an
// event whose id is known already is a duplicate and is left out), then the
// "already" check for each new signal.

import { alreadyFor } from "./already.ts";
import { type LiveEvent, signalFromEvent } from "./live.ts";
import type { KobbleSignal } from "./schemas.ts";
import type { KobbleStore } from "./store.ts";

// Writes the new signals and answers with them.
export function takeInEvents(
  store: KobbleStore,
  events: LiveEvent[],
): KobbleSignal[] {
  const signals = store.all("signals");
  const known = new Set(signals.map((signal) => signal.sourceId));
  const personas = store.all("personas");
  const explorations = store.all("explorations");
  const added: KobbleSignal[] = [];
  for (const event of events) {
    if (known.has(event.id)) continue;
    known.add(event.id);
    const signal = signalFromEvent(event, store.nextId("signals"), personas);
    const already = alreadyFor(signal.text, explorations, signals);
    added.push(store.put("signals", { ...signal, already }));
  }
  return added;
}

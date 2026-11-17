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

// What a persona test found, as new signals from that persona (source
// test), each through the same "already" check.
export function takeInFindings(
  store: KobbleStore,
  found: { persona: string; at: string; findings: Finding[] },
): KobbleSignal[] {
  const signals = store.all("signals");
  const explorations = store.all("explorations");
  return found.findings.map((finding) => {
    const signal = store.put("signals", {
      id: store.nextId("signals"),
      type: finding.type,
      source: "test",
      sourceId: null,
      customer: null,
      persona: found.persona,
      at: found.at,
      text: finding.text,
      status: "new",
      to: null,
      already: alreadyFor(finding.text, explorations, signals),
    });
    signals.push(signal);
    return signal;
  });
}

export type Finding = { type: "bug" | "feedback"; text: string };

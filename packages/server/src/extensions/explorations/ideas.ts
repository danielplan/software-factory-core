// Explorations' plug (`ideas`): the explorations there are, an idea taken
// in (a new one, or a signal heard), where one is on the page, a
// prototype's address for a persona's mission, and the cards explorations
// were handed off as.

import {
  type Exploration,
  heardOf,
  type KobbleSignal,
  type KobbleStore,
  titleOf,
} from "@software-factory/core";

import type { IdeasPlug } from "../../plugs/ideas.ts";
import type { PersonasPlug } from "../../plugs/personas.ts";
import { Refused } from "../../refused.ts";
import { newExploration } from "./actions.ts";
import { branchParts } from "./routes.ts";
import { exploreAt } from "./support.ts";

// The explorations, as other extensions reach them.
export function ideasOffer(on: {
  store: () => KobbleStore;
  personas: () => PersonasPlug | null;
  // A prototype's address, opened for a persona.
  prototype: (id: string, key: string, persona: string) => Promise<string>;
}): IdeasPlug {
  return {
    all: () => on.store().all("explorations"),
    take: (idea) => newExploration(on.store(), idea, on.personas()),
    hear: (signal) => hearSignal(on.store(), signal),
    address: exploreAt,
    prototype: (branch, persona) => {
      const parts = branchParts(branch);
      if (!parts) throw new Refused(`“${branch}” is not a prototype's branch.`);
      return on.prototype(parts.exploration, parts.key, persona);
    },
    handedOff: () =>
      on
        .store()
        .all("explorations")
        .flatMap((one) =>
          one.work === null ? [] : [handedOffAs(on.store(), one, one.work)],
        ),
  };
}

// An exploration handed off as a card, with the prototype agreed.
function handedOffAs(store: KobbleStore, one: Exploration, work: number) {
  const agreed = store
    .board(one.id)
    .things.find((thing) => thing.kind === "prototype" && thing.agreed);
  return {
    work,
    exploration: one.id,
    title: one.title,
    key: agreed?.kind === "prototype" ? agreed.key : null,
  };
}

// A signal heard: added to the open exploration the "already" check found
// for it, or a new exploration that waits to be started. The exploration
// keeps its own copy of what the signal says, since the signal file stays
// on this computer.
export function hearSignal(
  store: KobbleStore,
  signal: KobbleSignal,
  now: Date = new Date(),
): Exploration {
  const found =
    signal.already?.kind === "exploration"
      ? store.get("explorations", signal.already.id)
      : null;
  const open =
    found && ["waiting", "exploring"].includes(found.status) ? found : null;
  const personas = signal.persona ? [signal.persona] : [];
  return store.put(
    "explorations",
    open
      ? {
          ...open,
          signals: [...open.signals, signal.id],
          heard: [...open.heard, heardOf(signal)],
          personas: [...new Set([...open.personas, ...personas])],
        }
      : {
          id: store.nextId("explorations"),
          title: titleOf(signal.text),
          status: "waiting",
          personas,
          signals: [signal.id],
          heard: [heardOf(signal)],
          problem: signal.text,
          created: now.toISOString(),
          work: null,
        },
  );
}

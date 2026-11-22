// The plugs of Kobble's own extensions into Sprocket, made again each time
// (what is installed can change): each extension's own, next to its code.

import type { KobbleStore } from "@software-factory/core";

import type { Cards } from "../../cards/cards.ts";
import type { SupportCards } from "../card-look.ts";
import type { SupportPlug } from "../support-plug.ts";
import { explorationsPlug } from "./explorations.ts";
import { factoryPlug } from "./factory.ts";
import { personasPlug } from "./personas.ts";
import { releasesPlug } from "./releases.ts";
import { signalsPlug } from "./signals.ts";

// What the plugs reach of Kobble: Doodle's talks and the tester.
export type Reach = {
  explorations: {
    talks: Parameters<typeof explorationsPlug>[0]["talks"];
  };
  tests: { tests: Parameters<typeof personasPlug>[0]["tests"] };
};

export function kobblePlugs(
  on: Reach & {
    store: () => KobbleStore;
    changed: (what: string) => void;
    board: () => Cards;
    cards: SupportCards;
    isOn: (extension: string) => boolean;
  },
): () => SupportPlug[] {
  return () => [
    factoryPlug(on.cards),
    explorationsPlug({ ...on, talks: on.explorations.talks }),
    personasPlug({ ...on, tests: on.tests.tests }),
    signalsPlug({ ...on, cards: on.board }),
    releasesPlug,
  ];
}

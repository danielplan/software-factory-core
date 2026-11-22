// The plugs of Kobble's own extensions into Sprocket, made again each time
// (what is installed can change): each extension's own, next to its code.

import type { KobbleStore } from "@software-factory/core";

import type { Cards } from "../../cards/cards.ts";
import type { SupportCards } from "../../extensions/factory/card-look.ts";
import type { SupportPlug } from "../support-plug.ts";
import { explorationsPlug } from "../../extensions/explorations/support.ts";
import { factoryPlug } from "../../extensions/factory/support.ts";
import { personasPlug } from "../../extensions/personas/support.ts";
import { releasesPlug } from "../../extensions/releases/support.ts";
import { signalsPlug } from "../../extensions/signals/support.ts";

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

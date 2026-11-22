// Signals' plug into Sprocket: the new signals, and one handed on to the
// builder (a card on the board) or to Doodle (an exploration). It offers
// only the kobolds whose extension is installed. Heard only while Signals is
// installed.

import type { KobbleStore } from "@software-factory/core";
import { z } from "zod";

import type { Cards } from "../../cards/cards.ts";
import { handOff, type SupportPlug } from "../../kobble/support-plug.ts";
import type { IdeasPlug } from "../../plugs/ideas.ts";
import { Refused } from "../../refused.ts";
import { exploreSignal, fixSignal } from "./actions.ts";

const GUIDE = `**Signals** (\`#signals\`): what came in from the live app and from people (bugs, feature requests, feedback). A new one they want dealt with (\`list_new_signals\`): to the builder when it is a fix, to Doodle when it needs thinking through; say which, and once they agree, \`send_signal\`.`;

export function signalsPlug(on: {
  store: () => KobbleStore;
  cards: () => Cards;
  isOn: (extension: string) => boolean;
  // Explorations' plug: Doodle, while it is installed.
  ideas: () => IdeasPlug | null;
  changed: (what: string) => void;
}): SupportPlug {
  const ideas = on.ideas();
  const to = [
    ...(on.isOn("factory") ? (["builder"] as const) : []),
    ...(ideas ? (["doodle"] as const) : []),
  ];
  return {
    extension: "signals",
    pages: ["signals"],
    guide: GUIDE,
    handOffs: [
      listNewSignals(on.store),
      ...(to.length === 0
        ? []
        : [
            handOff({
              name: "send_signal",
              description: `Hands a new signal on (${to.join(" or ")}): the builder makes it a card to fix, Doodle an exploration to think through; takes the person there. Only once they agreed.`,
              input: {
                id: z
                  .string()
                  .describe("The signal's id, from list_new_signals."),
                to: z.enum(["builder", "doodle"]),
              },
              run: async ({ id, to: kobold }) => {
                if (!to.includes(kobold))
                  throw new Refused(
                    `${kobold === "builder" ? "The Factory" : "Explorations"} is not installed: take them to the Marketplace (#extensions) to install it.`,
                  );
                if (kobold === "builder") {
                  await fixSignal(on.store(), id, on.cards);
                  on.changed("signals");
                  return { said: "Handed to the builder.", to: "#build" };
                }
                const { exploration } = exploreSignal(on.store(), id, ideas);
                on.changed("signals");
                on.changed("explorations");
                return {
                  said: "Handed to Doodle.",
                  to: ideas?.address(exploration.id) ?? "#explore",
                };
              },
            }),
          ]),
    ],
  };
}

function listNewSignals(store: () => KobbleStore) {
  return handOff({
    name: "list_new_signals",
    description: "The signals not sorted on yet: id, kind, what it says.",
    run: () => {
      const fresh = store()
        .all("signals")
        .filter((one) => one.status === "new");
      return {
        said:
          fresh.length === 0
            ? "No new signals."
            : fresh
                .map((one) => `- ${one.id} (${one.type}): ${one.text}`)
                .join("\n"),
      };
    },
  });
}

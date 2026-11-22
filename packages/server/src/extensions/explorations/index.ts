// Explorations: an idea thought through with Doodle, the explorer kobold,
// on a whiteboard; Tinker, its maker, builds prototypes of it, and the one
// the team agrees on is handed off as a card (the `tasks` slot). It owns
// the `explorations` records and offers them through its plug (`ideas`);
// who an idea is for and a prototype's tests come from Personas' plugs,
// the board's ideas from the Factory's (`work`).

import { defineExtension } from "@software-factory/core";

import { keptAll, usageOf } from "../../kobble/records.ts";
import type { Host, Served } from "../../plugs/extension.ts";
import { explorationAnswers } from "./answers.ts";
import { ideasOffer } from "./ideas.ts";
import { servedExplorations } from "./routes.ts";
import { explorationsPlug } from "./support.ts";
import { explorationRoutes } from "./usage.ts";

export const extension = defineExtension({
  id: "explorations",
  name: "Explorations",
  about: "Explore an idea before building.",
  core: true,
  needs: ["factory"],
  // An agreed prototype is handed off as a card on the board.
  slots: ["tasks"],
  brings: {
    pages: ["explore"],
    blocks: ["exploring"],
    kobolds: ["explorer"],
  },
  stages: [
    {
      id: "explore",
      name: "Explorations",
      after: ["signals"],
      before: ["build", "done"],
    },
  ],
});

export function serve(host: Host): Served {
  const personas = () => host.plug("personas");
  const explorations = servedExplorations({
    project: host.project,
    root: host.factory,
    claude: host.claude,
    browser: host.browser,
    store: host.store,
    cards: host.cards,
    ideas: () => host.plug("work")?.ideas() ?? [],
    personas,
    missions: () => host.plug("missions"),
    onChange: () => {
      host.changed("explorations");
    },
  });
  return {
    routes: keptAll(
      explorationRoutes(explorations, () =>
        usageOf(host.factory, host.project),
      ),
    ),
    answers: explorationAnswers({
      boardTools: (id) => explorations.talks.tools(id),
      makerTools: (id, key) => explorations.prototypes.makerTools(id, key),
      worlds: explorations.worlds,
    }),
    offers: {
      ideas: ideasOffer({
        store: host.store,
        personas,
        prototype: (id, key, persona) =>
          explorations.prototypes.address(id, key, persona),
      }),
      home: {
        blocks: () => ({
          exploring: {
            count: (host.records()?.all("explorations") ?? []).filter(
              (one) => one.status === "exploring",
            ).length,
          },
        }),
      },
    },
    support: () =>
      explorationsPlug({
        store: host.store,
        personas,
        talks: explorations.talks,
        changed: host.changed,
      }),
    // Where the server answers Doodle's board tools and the makers'.
    listen: (base) => {
      explorations.talks.serveToolsAt(`${base}/kobble/explorations/mcp`);
      explorations.prototypes.serveAt(base);
    },
    stop: () => {
      explorations.close();
    },
  };
}

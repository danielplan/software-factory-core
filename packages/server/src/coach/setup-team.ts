// The team's settings chosen in setup ("How Kobble works"): cards built at
// once and the usage log. Saved in the factory folder's team file, which
// git keeps, even before the factory itself is written.

import { join } from "node:path";

import {
  builderSettings,
  FACTORY_FOLDER,
  parallelCards,
  readSettings,
  saveGroup,
  usageSettings,
} from "@software-factory/core";

import type { Route } from "../add-ons/add-on.ts";
import { Refused } from "../refused.ts";

export type TeamChoices = { cards: number; usage: boolean };

export function teamRoutes(project: string): Record<string, Route> {
  const root = join(project, FACTORY_FOLDER);
  const read = (): TeamChoices => ({
    cards: parallelCards(root),
    usage: readSettings(root, usageSettings.file).FACTORY_USAGE_LOG === "on",
  });
  return {
    "GET /api/setup/team": () => read(),
    "POST /api/setup/team": (body) => {
      const asked = (body ?? {}) as Partial<TeamChoices>;
      if (asked.cards !== undefined) {
        if (
          !Number.isInteger(asked.cards) ||
          asked.cards < 1 ||
          asked.cards > 5
        )
          throw new Refused("Cards at once is a number from 1 to 5.");
        saveGroup(builderSettings, root, {
          FACTORY_PARALLEL_CARDS: String(asked.cards),
        });
      }
      if (asked.usage !== undefined)
        saveGroup(usageSettings, root, {
          FACTORY_USAGE_LOG: asked.usage ? "on" : "off",
        });
      return read();
    },
  };
}

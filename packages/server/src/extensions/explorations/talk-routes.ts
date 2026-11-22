// The conversation with the kobold about an exploration: what the person
// says (also while it answers: it joins that answer) and Stop.

import type { KobbleStore } from "@software-factory/core";

import type { Route } from "../../plugs/extension.ts";
import { field } from "../../asked.ts";
import { explorationOf } from "./actions.ts";
import { attachedIn } from "./person-acts.ts";
import type { ExplorationTalks } from "./talks.ts";

export function talkRoutes(
  store: () => KobbleStore,
  talks: ExplorationTalks,
  button: (act: (body: unknown) => unknown) => Route,
): Record<string, Route> {
  const id = (body: unknown) => explorationOf(store(), field(body, "id")).id;
  return {
    "POST /api/kobble/explorations/say": button((body) => {
      void talks.say(
        id(body),
        field(body, "text"),
        attachedIn(body),
        spokenIn(body),
      );
    }),
    "POST /api/kobble/explorations/stop": button((body) => {
      talks.talk(id(body)).stop();
    }),
  };
}

// The language the person spoke in, when they talked instead of typing.
function spokenIn(body: unknown): string | undefined {
  const value = (body as { spokenIn?: unknown } | null)?.spokenIn;
  return typeof value === "string" && value.trim() ? value : undefined;
}

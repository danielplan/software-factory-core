// The conversation with the kobold about an exploration: what the person
// says (also while it answers: it joins that answer), Stop, and Try again after
// the explorer stopped.

import type { KobbleStore } from "@software-factory/core";

import type { Route } from "../../http.ts";
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
    "POST /api/kobble/explorations/again": button((body) => {
      void again(talks, id(body));
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

// Try again after the explorer stopped: the person's last words said again
// (taken back first, so the chat has them once), or, when there were none,
// the explorer's first look.
async function again(talks: ExplorationTalks, id: string): Promise<void> {
  const talk = talks.talk(id);
  if (talk.working || talk.problem === null) return;
  const words = talk.takeBack();
  if (words === null) await talks.begin(id);
  else await talks.say(id, words);
}

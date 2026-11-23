// What a person does on an exploration's board, as buttons: the acts of
// person-acts.ts, a picture, and the things they add themselves
// (own-things.ts). Each is done, then the page is told.

import type { KobbleStore } from "@software-factory/core";

import { field } from "../../asked.ts";
import type { Route } from "../../http.ts";
import { type Look, lookAtPage } from "./link-preview.ts";
import { ownThings } from "./own-things.ts";
import { addPicture, personActs } from "./person-acts.ts";
import { explorationOf } from "./actions.ts";
import type { ExplorationTalks } from "./talks.ts";

export function boardRoutes(
  store: () => KobbleStore,
  button: (act: (body: unknown) => unknown) => Route,
  talks: ExplorationTalks,
  options: {
    // How a link's page is read for its preview (the web unless a test says).
    look?: Look;
    onChange: () => void;
  },
): Record<string, Route> {
  const id = (body: unknown) => explorationOf(store(), field(body, "id")).id;
  return {
    "POST /api/kobble/explorations/board": button((body) => {
      personActs(store(), talks, id(body), body);
    }),
    "POST /api/kobble/explorations/picture": button((body) => ({
      thing: addPicture(store(), talks, id(body), body),
    })),
    // A note, a link, a stroke on a card: what a person adds themselves.
    "POST /api/kobble/explorations/mine": button((body) =>
      ownThings(
        {
          store: store(),
          talks,
          look: options.look ?? lookAtPage,
          onChange: options.onChange,
        },
        id(body),
        body,
      ),
    ),
  };
}

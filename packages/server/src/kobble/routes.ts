// Kobble's routes for the Signals and Personas pages, and the sync with the
// live app. Like every button, a POST is answered only from the factory's
// page (server.ts). Each change is told on the page's stream as a
// `kobble-changed` event; the page reads what it shows again.

import { join } from "node:path";

import {
  FACTORY_FOLDER,
  hasFactory,
  KobbleRefused,
  KobbleStore,
} from "@software-factory/core";

import type { Route } from "../add-ons/add-on.ts";
import { asked, field } from "../asked.ts";
import { Refused } from "../refused.ts";
import {
  addPersona,
  dismissSignal,
  exploreSignal,
  fixSignal,
} from "./actions.ts";
import { liveSettings } from "./live-source.ts";
import { LiveSync } from "./sync.ts";
import { personaPage, personasView, signalsView } from "./views.ts";

type KobbleOptions = {
  project: string;
  tell: (event: string) => void;
};

export function servedKobble(options: KobbleOptions) {
  const factory = join(options.project, FACTORY_FOLDER);
  const changed = (what: string) => {
    options.tell(
      `event: kobble-changed\ndata: ${JSON.stringify({ what })}\n\n`,
    );
  };
  // The records once the factory is there; none in setup.
  const maybe = () => (hasFactory(factory) ? new KobbleStore(factory) : null);
  const store = () => {
    const found = maybe();
    if (!found)
      throw new Refused("There is no factory yet: its records come with it.");
    return found;
  };
  const sync = new LiveSync({
    store: maybe,
    settings: () => liveSettings(options.project),
    onSynced: () => {
      changed("signals");
    },
  });
  // A change to the records, told to the page; a record that does not fit
  // is refused with why.
  const changing =
    (what: string, act: Route): Route =>
    async (body, url) => {
      const answer = await kept(() => act(body, url));
      changed(what);
      return answer;
    };
  const routes: Record<string, Route> = {
    "GET /api/kobble/signals": () =>
      kept(() => signalsView(store(), sync.view())),
    "POST /api/kobble/sync": async () => {
      const added = await sync.sync();
      return { added: added.length, sync: sync.view() };
    },
    ...buttonRoutes(store, changing),
    "GET /api/kobble/personas": () => kept(() => personasView(store())),
    "GET /api/kobble/persona": (_body, url) =>
      kept(() => personaPage(store(), asked(url, "id", "persona"))),
  };
  return {
    routes,
    start: () => {
      sync.start();
    },
    close: () => {
      sync.close();
    },
  };
}

// The buttons: Fix, Explore (or Add to), Dismiss, and New persona.
function buttonRoutes(
  store: () => KobbleStore,
  changing: (what: string, act: Route) => Route,
): Record<string, Route> {
  return {
    "POST /api/kobble/signals/fix": changing("signals", (body) => ({
      signal: fixSignal(store(), field(body, "id")),
    })),
    "POST /api/kobble/signals/explore": changing("signals", (body) =>
      exploreSignal(store(), field(body, "id")),
    ),
    "POST /api/kobble/signals/dismiss": changing("signals", (body) => ({
      signal: dismissSignal(store(), field(body, "id")),
    })),
    "POST /api/kobble/personas": changing("personas", (body) => ({
      persona: addPersona(store(), body),
    })),
  };
}

// What the records answer; a file that does not fit is refused with why.
async function kept<T>(read: () => T | Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof KobbleRefused) throw new Refused(error.message);
    throw error;
  }
}

// Kobble's routes for the Signals and Personas pages, and the sync with the
// live app. Like every button, a POST is answered only from the factory's
// page (server.ts). Each change is told on the page's stream as a
// `kobble-changed` event; the page reads what it shows again.

import { join } from "node:path";

import {
  type Claude,
  FACTORY_FOLDER,
  hasFactory,
  KobbleRefused,
  KobbleStore,
} from "@software-factory/core";

import type { Route } from "../add-ons/add-on.ts";
import type { Cli } from "../add-ons/github/github.ts";
import { asked, field } from "../asked.ts";
import type { WorkView } from "../api.ts";
import type { Cards } from "../cards/cards.ts";
import { cardsFor } from "../cards/cards-for.ts";
import { Refused } from "../refused.ts";
import {
  addPersona,
  dismissSignal,
  exploreSignal,
  fixSignal,
} from "./actions.ts";
import type { BoardTools } from "./explorations/board-tools.ts";
import { branchParts, servedExplorations } from "./explorations/routes.ts";
import { liveSettings } from "./live-source.ts";
import { type Browser, PersonaTests } from "./persona-tests.ts";
import { LiveSync } from "./sync.ts";
import { factoryView } from "./factory-view.ts";
import {
  personaPage,
  personasView,
  signalsView,
  testPage,
  testsOf,
} from "./views.ts";

type KobbleOptions = {
  project: string;
  tell: (event: string) => void;
  claude: Claude;
  // The GitHub CLI, for the connected board (Fix, Hand off).
  cli: Cli;
  // The connected board's cards as the builder last read them; none
  // without a board.
  work: () => WorkView | null;
  // What a persona test runs on: the app's address (as it is now), and a
  // browser.
  testsRunOn: { app: () => Promise<string>; browser: () => Promise<Browser> };
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
  const changing = changingWith(changed);
  const { explorations, tests } = explorationsAndTests(options, store, changed);
  const routes: Record<string, Route> = {
    "GET /api/kobble/signals": () =>
      kept(() => signalsView(store(), sync.view(), options.work())),
    "GET /api/kobble/factory": () =>
      kept(() => factoryView(store(), options.work())),
    "POST /api/kobble/sync": async () => {
      const added = await sync.sync();
      return { added: added.length, sync: sync.view() };
    },
    ...buttonRoutes(store, changing, () =>
      connectedCards(factory, options.cli),
    ),
    ...tests.routes,
    ...keptAll({
      ...explorations.routes,
      "POST /api/kobble/explorations/test": explorations.testRoute(tests.tests),
    }),
  };
  return {
    routes,
    // Where the server answers the kobold's board tools.
    serveToolsAt: (base: string) => {
      explorations.talks.serveToolsAt(`${base}/kobble/explorations/mcp`);
    },
    boardTools: (id: string): BoardTools => explorations.talks.tools(id),
    start: () => {
      if (maybe()) tests.recover();
      sync.start();
    },
    close: () => {
      sync.close();
      explorations.close();
    },
  };
}

// A change to the records, told to the page; a record that does not fit is
// refused with why.
function changingWith(changed: (what: string) => void) {
  return (what: string, act: Route): Route =>
    async (body, url) => {
      const answer = await kept(() => act(body, url));
      changed(what);
      return answer;
    };
}

// The connected board's cards; refused with how to connect one when there
// is none.
function connectedCards(factory: string, cli: Cli): Cards {
  const found = cardsFor(factory, cli);
  if ("problem" in found)
    throw new Refused(
      `No GitHub board is connected, so there is nowhere to put it. ${found.problem} Connect one in Settings, under Where work is tracked.`,
    );
  return found.cards;
}

// The explorations, and persona tests, which may run on a prototype of one.
function explorationsAndTests(
  options: KobbleOptions,
  store: () => KobbleStore,
  changed: (what: string) => void,
) {
  const factory = join(options.project, FACTORY_FOLDER);
  const explorations = servedExplorations({
    project: options.project,
    root: factory,
    claude: options.claude,
    store,
    cards: () => connectedCards(factory, options.cli),
    onChange: () => {
      changed("explorations");
    },
  });
  const tests = testRoutes(options, store, {
    onChange: () => {
      changed("tests");
    },
    prototype: (on) => {
      const parts = branchParts(on);
      if (!parts) throw new Refused(`“${on}” is not a prototype's branch.`);
      return explorations.prototypes.address(parts.exploration, parts.key);
    },
  });
  return { explorations, tests };
}

// Persona tests: start one, a persona's tests, one test.
function testRoutes(
  options: KobbleOptions,
  store: () => KobbleStore,
  more: { onChange: () => void; prototype: (on: string) => Promise<string> },
) {
  const tests = new PersonaTests({
    claude: options.claude,
    cwd: options.project,
    store,
    app: (on) =>
      on === "main" ? options.testsRunOn.app() : more.prototype(on),
    browser: options.testsRunOn.browser,
    onChange: more.onChange,
  });
  const routes: Record<string, Route> = {
    "GET /api/kobble/tests": (_body, url) =>
      kept(() => ({
        tests: testsOf(store(), asked(url, "persona", "persona")),
      })),
    "GET /api/kobble/test": (_body, url) =>
      kept(() => testPage(store(), asked(url, "id", "test"))),
    "POST /api/kobble/tests": (body) =>
      kept(() => ({ test: tests.start(body) })),
  };
  return {
    routes,
    tests,
    recover: () => {
      tests.recover();
    },
  };
}

// Routes whose records may not fit: refused with why.
function keptAll(routes: Record<string, Route>): Record<string, Route> {
  return Object.fromEntries(
    Object.entries(routes).map(([name, route]) => [
      name,
      (body: unknown, url: URL) => kept(() => route(body, url)),
    ]),
  );
}

// The buttons: Fix, Explore (or Add to), Dismiss; the personas, and New
// persona.
function buttonRoutes(
  store: () => KobbleStore,
  changing: (what: string, act: Route) => Route,
  cards: () => Cards,
): Record<string, Route> {
  return {
    "GET /api/kobble/personas": () => kept(() => personasView(store())),
    "GET /api/kobble/persona": (_body, url) =>
      kept(() => personaPage(store(), asked(url, "id", "persona"))),
    "POST /api/kobble/signals/fix": changing("signals", async (body) => ({
      signal: await fixSignal(store(), field(body, "id"), cards),
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

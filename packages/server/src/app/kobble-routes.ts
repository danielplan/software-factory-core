// Kobble's routes for the Signals and Personas pages, and the sync with the
// live app. Like every button, a POST is answered only from the factory's
// page (server.ts). Each change is told on the page's stream as a
// `kobble-changed` event; the page reads what it shows again.

import { join } from "node:path";

import {
  type Claude,
  FACTORY_FOLDER,
  KobbleRefused,
  KobbleStore,
} from "@software-factory/core";

import type { Route } from "../plugs/extension.ts";
import type { Cli } from "../extensions/github/github.ts";
import { asked, field } from "../asked.ts";
import type { WorkView } from "../api.ts";
import type { Cards } from "../cards/cards.ts";
import { Refused } from "../refused.ts";
import {
  addPersona,
  dismissSignal,
  exploreSignal,
  fixSignal,
} from "../extensions/signals/actions.ts";
import type { BoardTools } from "../extensions/explorations/board-tools.ts";
import type { MakerTools } from "../extensions/explorations/maker-tools.ts";
import {
  branchParts,
  servedExplorations,
} from "../extensions/explorations/routes.ts";
import {
  explorationRoutes,
  storeOf,
  usageOf,
} from "../extensions/explorations/usage.ts";
import { liveSettings } from "../extensions/signals/live-source.ts";
import {
  type App,
  MissionIdeas,
} from "../extensions/personas/mission-ideas.ts";
import {
  type Browser,
  PersonaTests,
} from "../extensions/personas/persona-tests.ts";
import { LiveSync } from "../extensions/signals/sync.ts";
import { connect, disconnect } from "../extensions/signals/connect.ts";
import { boardIdeas, factoryView } from "../extensions/factory/factory-view.ts";
import { connectedCards } from "../kobble/connected-cards.ts";
import { supportOf, supportRoutes } from "../kobble/support.ts";
import type { SupportTools } from "../kobble/support-tools.ts";
import {
  handledView,
  personaPage,
  personasView,
  signalsView,
  testPage,
  testsOf,
} from "../extensions/signals/views.ts";

type KobbleOptions = {
  project: string;
  tell: (event: string) => void;
  claude: Claude;
  // The GitHub CLI, for the connected board (Fix, Hand off).
  cli: Cli;
  // The connected board's cards as the builder last read them; none
  // without a board.
  work: () => WorkView | null;
  // The owner's answer on a stuck card, handed back to the builder.
  answer: (number: number, text: string) => Promise<void>;
  // Whether an extension is installed now; Sprocket hears its plug only then.
  isOn: (extension: string) => boolean;
  // The guides the team's own extensions bring Sprocket.
  supportGuides: () => { title: string; file: string }[];
  // What a persona test runs on: the apps it can be sent into, an app's
  // address as it is now (the first app's without a product), and a
  // browser.
  testsRunOn: {
    apps: () => App[];
    app: (product: string | null) => Promise<string>;
    browser: () => Promise<Browser>;
  };
};

// Tells the page what of Kobble changed ("signals", "explorations" …).
export function tellerOf(tell: (event: string) => void) {
  return (what: string) => {
    tell(`event: kobble-changed\ndata: ${JSON.stringify({ what })}\n\n`);
  };
}

export function servedKobble(options: KobbleOptions) {
  const factory = join(options.project, FACTORY_FOLDER);
  const changed = tellerOf(options.tell);
  const { maybe, store } = storesOf(factory, options.project);
  const sync = new LiveSync({
    store: maybe,
    settings: () => liveSettings(options.project),
    onSynced: () => {
      changed("signals");
    },
  });
  const changing = changingWith(changed);
  const { explorations, tests } = explorationsAndTests(options, store, changed);
  const support = supportOf(options, store, changed, { explorations, tests });
  const routes: Record<string, Route> = {
    "GET /api/kobble/signals": () =>
      kept(() => signalsView(store(), sync.view(), options.work())),
    "GET /api/kobble/factory": () =>
      kept(() => factoryView(store(), options.work())),
    "POST /api/kobble/sync": async () => {
      const added = await sync.sync();
      return { added: added.length, sync: sync.view() };
    },
    ...liveRoutes(options.project, sync, changed),
    "GET /api/kobble/handled": () => kept(() => handledView(store())),
    ...buttonRoutes(store, changing, () =>
      connectedCards(factory, options.cli),
    ),
    ...tests.routes,
    ...supportRoutes(support),
    ...keptAll(
      explorationRoutes(explorations, tests.tests, () =>
        usageOf(factory, options.project),
      ),
    ),
  };
  return {
    routes,
    // Where the server answers the kobold's board tools.
    serveToolsAt: (base: string) => {
      explorations.talks.serveToolsAt(`${base}/kobble/explorations/mcp`);
      explorations.prototypes.serveAt(base);
      support.serveToolsAt(`${base}/kobble/support/mcp`);
    },
    boardTools: (id: string): BoardTools => explorations.talks.tools(id),
    makerTools: (id: string, key: string): MakerTools =>
      explorations.prototypes.makerTools(id, key),
    supportTools: (): SupportTools => support.tools(),
    // The made-up worlds the prototypes share (world-route.ts).
    worlds: explorations.worlds,
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

// The records once the factory is there; none in setup (maybe), or
// refused (store).
function storesOf(factory: string, project: string) {
  const maybe = () => storeOf(factory, project);
  const store = () => {
    const found = maybe();
    if (!found)
      throw new Refused("There is no factory yet: its records come with it.");
    return found;
  };
  return { maybe, store };
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

// Connecting the live app and disconnecting it; each sync starts again.
function liveRoutes(
  project: string,
  sync: LiveSync,
  changed: (what: string) => void,
): Record<string, Route> {
  return {
    "POST /api/kobble/connect": async (body) => {
      const { ignored } = await connect(project, body);
      sync.start();
      changed("signals");
      return { ignored, sync: sync.view() };
    },
    "POST /api/kobble/disconnect": () => {
      disconnect(project);
      sync.close();
      changed("signals");
      return { sync: sync.view() };
    },
  };
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
    browser: options.testsRunOn.browser,
    store,
    cards: () => connectedCards(factory, options.cli),
    ideas: () => boardIdeas(options.work()),
    onChange: () => {
      changed("explorations");
    },
  });
  const tests = testRoutes(options, store, {
    onChange: () => {
      changed("tests");
    },
    prototype: (on, persona) => {
      const parts = branchParts(on);
      if (!parts) throw new Refused(`“${on}” is not a prototype's branch.`);
      return explorations.prototypes.address(
        parts.exploration,
        parts.key,
        persona,
      );
    },
  });
  return { explorations, tests };
}

// Persona tests (missions): the one the kobold suggests, start one, a
// persona's tests, one test.
function testRoutes(
  options: KobbleOptions,
  store: () => KobbleStore,
  more: {
    onChange: () => void;
    prototype: (on: string, persona: string) => Promise<string>;
  },
) {
  const tests = new PersonaTests({
    claude: options.claude,
    cwd: options.project,
    store,
    app: (test) =>
      test.on === "main"
        ? options.testsRunOn.app(test.product ?? null)
        : more.prototype(test.on, test.persona),
    browser: options.testsRunOn.browser,
    onChange: more.onChange,
  });
  const ideas = new MissionIdeas({
    claude: options.claude,
    cwd: options.project,
    store,
    apps: options.testsRunOn.apps,
  });
  const routes: Record<string, Route> = {
    "GET /api/kobble/mission": (_body, url) =>
      kept(async () => ({
        mission: await ideas.suggest(
          asked(url, "persona", "persona"),
          url.searchParams.get("again") === "yes",
        ),
      })),
    "GET /api/kobble/tests": (_body, url) =>
      kept(() => ({
        tests: testsOf(store(), asked(url, "persona", "persona")),
      })),
    "GET /api/kobble/test": (_body, url) =>
      kept(() => testPage(store(), asked(url, "id", "test"))),
    "POST /api/kobble/tests": (body) =>
      kept(() => {
        const test = tests.start(body);
        ideas.forget(test.persona);
        return { test };
      }),
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

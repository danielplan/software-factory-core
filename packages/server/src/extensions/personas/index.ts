// Personas: the real customers the product is for, and the missions the
// tester kobold goes on as one of them (persona tests). It owns the
// `personas` and `tests` records and offers them through its plugs
// (`personas`, `missions`); what a mission finds goes to Signals' plug, and
// a mission on a prototype runs where Explorations' plug (`ideas`) says.

import { defineExtension, type KobbleStore } from "@software-factory/core";

import { asked } from "../../asked.ts";
import type { Route } from "../../http.ts";
import { kept } from "../../kobble/records.ts";
import type { Host, Served } from "../../plugs/extension.ts";
import type { MissionsPlug } from "../../plugs/missions.ts";
import type { PersonasPlug } from "../../plugs/personas.ts";
import { Refused } from "../../refused.ts";
import { addPersona } from "./actions.ts";
import { MissionIdeas } from "./mission-ideas.ts";
import { PersonaTests } from "./persona-tests.ts";
import { personasPlug as supportPlug } from "./support.ts";
import {
  missionsNow,
  personaPage,
  personasView,
  testPage,
  testsOf,
} from "./views.ts";

export const extension = defineExtension({
  id: "personas",
  name: "Personas",
  about: "Made-up customers who try the app.",
  core: true,
  needs: ["signals"],
  brings: { pages: ["personas"], kobolds: ["tester"] },
});

// The personas, as other extensions reach them.
export function personasOffer(store: () => KobbleStore): PersonasPlug {
  return {
    all: () => store().all("personas"),
    get: (id) => store().get("personas", id),
    add: (persona) => addPersona(store(), persona),
  };
}

// The missions, as other extensions reach them.
export function missionsOffer(
  store: () => KobbleStore,
  tests: Pick<PersonaTests, "start">,
): MissionsPlug {
  return {
    of: (ids) =>
      store()
        .all("tests")
        .filter((test) => ids.includes(test.id)),
    now: () => missionsNow(store()),
    start: (mission) => tests.start(mission),
  };
}

export function serve(host: Host): Served {
  const tests = new PersonaTests({
    claude: host.claude,
    cwd: host.project,
    store: host.store,
    signals: () => host.plug("signals"),
    app: (test) =>
      test.on === "main"
        ? host.app(test.product ?? null)
        : prototype(host, test.on, test.persona),
    browser: host.browser,
    onChange: () => {
      host.changed("tests");
    },
  });
  const ideas = new MissionIdeas({
    claude: host.claude,
    cwd: host.project,
    store: host.store,
    apps: host.apps,
  });
  return {
    routes: {
      ...personaRoutes(host),
      ...missionRoutes(host, tests, ideas),
    },
    offers: {
      personas: personasOffer(host.store),
      missions: missionsOffer(host.store, tests),
    },
    support: () =>
      supportPlug({ store: host.store, tests, changed: host.changed }),
    // Missions that were running when the factory stopped.
    start: () => {
      if (host.records()) tests.recover();
    },
  };
}

// A mission on a prototype runs where Explorations opens it.
function prototype(host: Host, on: string, persona: string): Promise<string> {
  const ideas = host.plug("ideas");
  if (!ideas)
    throw new Refused(
      "Explorations is not installed, so there is no prototype to test.",
    );
  return ideas.prototype(on, persona);
}

// The personas, one persona, and New persona.
function personaRoutes(host: Host): Record<string, Route> {
  const signals = () => host.plug("signals")?.all() ?? [];
  return {
    "GET /api/kobble/personas": () =>
      kept(() => personasView(host.store(), signals())),
    "GET /api/kobble/persona": (_body, url) =>
      kept(() =>
        personaPage(host.store(), asked(url, "id", "persona"), signals()),
      ),
    "POST /api/kobble/personas": async (body) => {
      const answer = await kept(() => ({
        persona: addPersona(host.store(), body),
      }));
      host.changed("personas");
      return answer;
    },
  };
}

// Persona tests (missions): the one the kobold suggests, start one, a
// persona's tests, one test.
function missionRoutes(
  host: Host,
  tests: PersonaTests,
  ideas: MissionIdeas,
): Record<string, Route> {
  return {
    "GET /api/kobble/mission": (_body, url) =>
      kept(async () => ({
        mission: await ideas.suggest(
          asked(url, "persona", "persona"),
          url.searchParams.get("again") === "yes",
        ),
      })),
    "GET /api/kobble/tests": (_body, url) =>
      kept(() => ({
        tests: testsOf(host.store(), asked(url, "persona", "persona")),
      })),
    "GET /api/kobble/test": (_body, url) =>
      kept(() =>
        testPage(
          host.store(),
          asked(url, "id", "test"),
          host.plug("signals")?.all() ?? [],
        ),
      ),
    "POST /api/kobble/tests": (body) =>
      kept(() => {
        const test = tests.start(body);
        ideas.forget(test.persona);
        return { test };
      }),
  };
}

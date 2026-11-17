// The Explorations pages' routes: the list, one exploration, and its
// buttons (Start, New exploration, Drop, Make, Open, Test, Agree, Hand off,
// and what a person says to the kobold). Each change is told to the page;
// the kobold's tools are answered at /api/kobble/explorations/mcp/<id>.

import type { Claude, KobbleStore, PersonaTest } from "@software-factory/core";

import type { Route } from "../../add-ons/add-on.ts";
import { asked, field } from "../../asked.ts";
import type { Cards } from "../../cards/cards.ts";
import { Refused } from "../../refused.ts";
import type { PersonaTests } from "../persona-tests.ts";
import {
  agree,
  dropExploration,
  explorationOf,
  handOff,
  newExploration,
  startExploration,
} from "./actions.ts";
import { ExplorationPrototypes, prototypeBranch } from "./prototypes.ts";
import { ExplorationTalks } from "./talks.ts";
import { explorationPage, explorationsView } from "./views.ts";

type Options = {
  project: string;
  root: string;
  claude: Claude;
  store: () => KobbleStore;
  cards: () => Cards;
  onChange: () => void;
};

export function servedExplorations(options: Options) {
  const { store } = options;
  const talks = new ExplorationTalks({ ...options });
  const prototypes = new ExplorationPrototypes({ ...options });
  // A button: done, then the page is told.
  const button =
    (act: (body: unknown) => unknown): Route =>
    async (body) => {
      const answer = await act(body);
      options.onChange();
      return answer ?? {};
    };
  const routes = {
    ...readRoutes(store, talks, prototypes),
    ...buttonRoutes(store, button, { talks, prototypes, cards: options.cards }),
  };
  return {
    routes,
    talks,
    prototypes,
    // Test: a persona test on the prototype's branch, as the exploration's
    // first persona; it shows on the prototype's card.
    testRoute: (tests: PersonaTests): Route =>
      button((body) => ({ test: testPrototype(store(), tests, body) })),
    close: () => {
      prototypes.close();
    },
  };
}

// Test: a persona test on the prototype's branch, as the exploration's
// first persona; it shows on the prototype's card.
function testPrototype(
  store: KobbleStore,
  tests: PersonaTests,
  body: unknown,
): PersonaTest {
  const exploration = explorationOf(store, field(body, "id"));
  const key = field(body, "key");
  const board = store.board(exploration.id);
  const persona = exploration.personas[0];
  if (!board.prototypes.some((one) => one.key === key))
    throw new Refused(`${exploration.id} has no prototype ${key}.`);
  if (!persona)
    throw new Refused("Testing needs a persona: this exploration has none.");
  const test = tests.start({
    persona,
    task: field(body, "task"),
    on: prototypeBranch(exploration.id, key),
  });
  store.saveBoard(exploration.id, {
    ...board,
    prototypes: board.prototypes.map((one) =>
      one.key === key ? { ...one, tests: [...one.tests, test.id] } : one,
    ),
  });
  return test;
}

function readRoutes(
  store: () => KobbleStore,
  talks: ExplorationTalks,
  prototypes: ExplorationPrototypes,
): Record<string, Route> {
  return {
    "GET /api/kobble/explorations": () =>
      explorationsView(store(), (one) => talks.view(one)),
    "GET /api/kobble/exploration": (_body, url) => {
      const exploration = explorationOf(
        store(),
        asked(url, "id", "exploration"),
      );
      return explorationPage(store(), exploration, {
        runs: prototypes.runs(exploration.id),
        talk: talks.view(exploration.id),
      });
    },
  };
}

function buttonRoutes(
  store: () => KobbleStore,
  button: (act: (body: unknown) => unknown) => Route,
  on: {
    talks: ExplorationTalks;
    prototypes: ExplorationPrototypes;
    cards: () => Cards;
  },
): Record<string, Route> {
  const { talks, prototypes } = on;
  const id = (body: unknown) => explorationOf(store(), field(body, "id")).id;
  const key = (body: unknown) => field(body, "key");
  return {
    "POST /api/kobble/explorations": button((body) => ({
      exploration: newExploration(store(), body),
    })),
    "POST /api/kobble/explorations/start": button((body) => {
      const started = id(body);
      if (startExploration(store(), started)) void talks.begin(started);
    }),
    "POST /api/kobble/explorations/drop": button(async (body) => {
      const dropped = dropExploration(store(), field(body, "id"));
      await prototypes.stopAll(dropped.id);
    }),
    "POST /api/kobble/explorations/say": button((body) => {
      void talks.say(id(body), field(body, "text"));
    }),
    "POST /api/kobble/explorations/make": button((body) => ({
      board: prototypes.make(explorationOf(store(), id(body)), key(body)),
    })),
    "POST /api/kobble/explorations/open": button(async (body) => ({
      run: await prototypes.open(id(body), key(body)),
    })),
    "POST /api/kobble/explorations/agree": button((body) => {
      agree(store(), id(body), key(body));
    }),
    "POST /api/kobble/explorations/hand-off": button((body) =>
      handOff(store(), id(body), on.cards),
    ),
  };
}

// The exploration and the option a prototype's branch is for.
export function branchParts(
  on: string,
): { exploration: string; key: string } | null {
  const found = /^proto\/(X-\d+)-([a-z]+)$/.exec(on);
  return found?.[1] && found[2]
    ? { exploration: found[1], key: found[2].toUpperCase() }
    : null;
}

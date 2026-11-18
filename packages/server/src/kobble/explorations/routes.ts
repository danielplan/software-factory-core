// The Explorations pages' routes: the list, one exploration, and its
// buttons (Start, New exploration, Drop, Make, Open, Test, Hand off, what a
// person does on the board, and what they say to the kobold). Each change is told to the page;
// the kobold's tools are answered at /api/kobble/explorations/mcp/<id>.

import { extname } from "node:path";

import type { Claude, KobbleStore, PersonaTest } from "@software-factory/core";

import type { Route } from "../../add-ons/add-on.ts";
import { asked, field } from "../../asked.ts";
import type { Cards } from "../../cards/cards.ts";
import { Refused } from "../../refused.ts";
import type { PersonaTests } from "../persona-tests.ts";
import { FileAnswer } from "../../http.ts";
import { PICTURE_TYPES } from "../../coach/pictures.ts";
import { addPicture, attachedIn, personActs } from "./person-acts.ts";
import {
  dropExploration,
  explorationOf,
  handOff,
  newExploration,
  startExploration,
} from "./actions.ts";
import { withThing } from "./board-things.ts";
import {
  ExplorationPrototypes,
  prototypeBranch,
  prototypeOf,
} from "./prototypes.ts";
import { ExplorationTalks } from "./talks.ts";
import { explorationPage, explorationsView } from "./views.ts";
import { ExplorationWorlds } from "./worlds.ts";

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
  const worlds = new ExplorationWorlds(options);
  const talks = new ExplorationTalks({ ...options, worlds });
  const prototypes = new ExplorationPrototypes({ ...options, worlds });
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
    worlds,
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
  const made = prototypeOf(board, key);
  if (!made) throw new Refused(`${exploration.id} has no prototype ${key}.`);
  if (!persona)
    throw new Refused("Testing needs a persona: this exploration has none.");
  const test = tests.start({
    persona,
    task: field(body, "task"),
    on: prototypeBranch(exploration.id, key),
  });
  store.saveBoard(
    exploration.id,
    withThing(board, { ...made, tests: [...made.tests, test.id] }),
  );
  return test;
}

function readRoutes(
  store: () => KobbleStore,
  talks: ExplorationTalks,
  prototypes: ExplorationPrototypes,
): Record<string, Route> {
  return {
    "GET /api/kobble/explorations/picture": (_body, url) => {
      const file = store().pictureFile(
        explorationOf(store(), asked(url, "id", "exploration")).id,
        asked(url, "name", "picture"),
      );
      if (!file) throw new Refused("There is no such picture.");
      return new FileAnswer(file, PICTURE_TYPES[extname(file)] ?? "image/png");
    },
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
      void talks.say(
        id(body),
        field(body, "text"),
        attachedIn(body),
        spokenIn(body),
      );
    }),
    "POST /api/kobble/explorations/make": button((body) => ({
      board: prototypes.make(
        explorationOf(store(), id(body)),
        field(body, "choice"),
        key(body),
      ),
    })),
    "POST /api/kobble/explorations/open": button(async (body) => ({
      run: await prototypes.open(id(body), key(body), persona(body)),
    })),
    "POST /api/kobble/explorations/board": button((body) => {
      personActs(store(), talks, id(body), body);
    }),
    "POST /api/kobble/explorations/picture": button((body) => ({
      thing: addPicture(store(), talks, id(body), body),
    })),
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

// The persona a prototype is opened for, when one is.
function persona(body: unknown): string | undefined {
  const value = (body as { persona?: unknown } | null)?.persona;
  return typeof value === "string" && value ? value : undefined;
}

// The language the person spoke in, when they talked instead of typing.
function spokenIn(body: unknown): string | undefined {
  const value = (body as { spokenIn?: unknown } | null)?.spokenIn;
  return typeof value === "string" && value.trim() ? value : undefined;
}

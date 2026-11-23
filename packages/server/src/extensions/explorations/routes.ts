// The Explorations pages' routes: the list, one exploration, and its
// buttons (Start, New exploration, Drop, Make, Open, Test, Hand off, what a
// person does on the board, and what they say to the kobold). Each change is told to the page;
// the kobold's tools are answered at /api/kobble/explorations/mcp/<id>.

import { extname } from "node:path";

import type { Claude, KobbleStore, PersonaTest } from "@software-factory/core";

import type { Route } from "../../http.ts";
import { asked, field } from "../../asked.ts";
import type { Cards } from "../../cards/cards.ts";
import { Refused } from "../../refused.ts";
import { FileAnswer } from "../../http.ts";
import { PICTURE_TYPES } from "../../coach/pictures.ts";
import { addPicture, personActs } from "./person-acts.ts";
import {
  dropExploration,
  explorationOf,
  freshExploration,
  handOff,
  newExploration,
  startExploration,
} from "./actions.ts";
import { withThing } from "./board-things.ts";
import { ExplorationPrototypes } from "./prototypes.ts";
import { prototypeBranch, prototypeOf } from "./versions.ts";
import { ExplorationTalks } from "./talks.ts";
import { talkRoutes } from "./talk-routes.ts";
import { type SpecWriter, specWriter } from "./spec-writer.ts";
import type { MissionsPlug } from "../../plugs/missions.ts";
import type { PersonasPlug } from "../../plugs/personas.ts";
import type { BoardIdea } from "../../plugs/work.ts";
import { explorationPage, explorationsView } from "./views.ts";
import type { Browser } from "../../kobble/browser.ts";
import { ExplorationWorlds } from "./worlds.ts";
import { HandOffs } from "./handing-off.ts";

type Options = {
  project: string;
  root: string;
  claude: Claude;
  // A browser the maker clicks through its prototype with.
  browser?: () => Promise<Browser>;
  store: () => KobbleStore;
  cards: () => Cards;
  // The board's ideas (its Backlog), as the builder last read them.
  ideas?: () => BoardIdea[];
  // Personas' plugs: who an idea is for, and the prototypes' tests; none
  // while Personas is not installed.
  personas: () => PersonasPlug | null;
  missions: () => MissionsPlug | null;
  onChange: () => void;
};

export function servedExplorations(options: Options) {
  const { store } = options;
  const worlds = new ExplorationWorlds(options);
  const talks = new ExplorationTalks({ ...options, worlds });
  const prototypes = new ExplorationPrototypes({ ...options, worlds });
  // A prototype made: the kobold who talks with the team reviews it.
  prototypes.whenReady((id, key, made) => {
    talks.review(id, key, made);
  });
  // Handed off, by the button or the kobold: the spec written (each step
  // shown on the page), the card made, the prototypes stopped.
  const handOffs = new HandOffs(options.onChange);
  const handOffNow = (id: string) =>
    handOffs.run(id, async ({ stage, step }) => {
      const write = writerOf(options, step);
      const handed = await handOff(
        store(),
        id,
        options.cards,
        async (on) => {
          const spec = await write(on);
          stage("card");
          return spec;
        },
        options.missions(),
      );
      stage("prototypes");
      await prototypes.removeAll(id);
      return handed;
    });
  talks.makeWith(makersFor(store, prototypes, options, handOffNow));
  // A button: done, then the page is told.
  const button =
    (act: (body: unknown) => unknown): Route =>
    async (body) => {
      const answer = await act(body);
      options.onChange();
      return answer ?? {};
    };
  const routes = {
    ...readRoutes(store, { talks, prototypes, handOffs }, options),
    ...buttonRoutes(store, button, {
      talks,
      prototypes,
      handOffNow,
      personas: options.personas,
    }),
    ...talkRoutes(store, talks, button),
  };
  return {
    routes,
    talks,
    prototypes,
    worlds,
    // Test: a persona test on the prototype's branch, as the exploration's
    // first persona; it shows on the prototype's card.
    testRoute: button((body) => ({
      test: testPrototype(store(), options.missions(), body),
    })),
    close: () => {
      prototypes.close();
    },
  };
}

// What the kobold who talks with the team can have made and done: making
// and changing prototypes, and handing the exploration off.
function makersFor(
  store: () => KobbleStore,
  prototypes: ExplorationPrototypes,
  options: Options,
  handOffNow: HandOffNow,
): Parameters<ExplorationTalks["makeWith"]>[0] {
  return {
    making: (id) => prototypes.beingMade(id),
    make: (id, choice, letters, opens) => {
      prototypes.make(explorationOf(store(), id), choice, letters, opens);
      options.onChange();
    },
    change: (id, prototype, change) => {
      const made = prototypes.change(
        explorationOf(store(), id),
        prototype,
        change,
      );
      options.onChange();
      return made;
    },
    // Handed off by the kobold, on the team's yes: as the button does.
    handOff: async (id) => {
      const handed = await handOffNow(id);
      return `Handed off as #${String(handed.issue)} (${handed.url}), in To do: the builder takes it from there. The exploration is closed.`;
    },
    release: (id, thing) => {
      const made = store()
        .board(id)
        .things.find((one) => one.id === thing);
      if (made?.kind === "prototype") prototypes.release(id, made.key);
    },
    deeper: (id, prototype, keep, ways) => {
      const keys = prototypes.deeper(
        explorationOf(store(), id),
        prototype,
        keep,
        ways,
      );
      options.onChange();
      return keys;
    },
    another: (id, prototype, way) => {
      const made = prototypes.another(
        explorationOf(store(), id),
        prototype,
        way,
      );
      options.onChange();
      return made;
    },
  };
}

// Test: a persona test on the prototype's branch, as the exploration's
// first persona; it shows on the prototype's card.
function testPrototype(
  store: KobbleStore,
  missions: MissionsPlug | null,
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
  if (!missions)
    throw new Refused(
      "Personas is not installed: install it in the Marketplace (#extensions) to test a prototype.",
    );
  const test = missions.start({
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
  on: {
    talks: ExplorationTalks;
    prototypes: ExplorationPrototypes;
    handOffs: HandOffs;
  },
  options: Options,
): Record<string, Route> {
  const { talks, prototypes, handOffs } = on;
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
      explorationsView(
        store(),
        (one) => talks.view(one),
        (one) => prototypes.runs(one),
        options.ideas?.() ?? [],
        options.personas(),
      ),
    "GET /api/kobble/exploration": (_body, url) => {
      const exploration = explorationOf(
        store(),
        asked(url, "id", "exploration"),
      );
      return explorationPage(store(), exploration, {
        runs: prototypes.runs(exploration.id),
        canRun: prototypes.mode.canStart(),
        talk: talks.view(exploration.id),
        handingOff: handOffs.of(exploration.id),
        personas: options.personas(),
        missions: options.missions(),
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
    handOffNow: HandOffNow;
    personas: () => PersonasPlug | null;
  },
): Record<string, Route> {
  const { talks, prototypes } = on;
  const id = (body: unknown) => explorationOf(store(), field(body, "id")).id;
  const key = (body: unknown) => field(body, "key");
  return {
    "POST /api/kobble/explorations": button((body) => ({
      exploration: newExploration(store(), body, on.personas()),
    })),
    "POST /api/kobble/explorations/fresh": button(() => ({
      exploration: freshExploration(store()),
    })),
    "POST /api/kobble/explorations/start": button((body) => {
      const started = id(body);
      if (startExploration(store(), started)) void talks.begin(started);
    }),
    "POST /api/kobble/explorations/drop": button(async (body) => {
      const dropped = dropExploration(store(), field(body, "id"));
      await prototypes.removeAll(dropped.id);
    }),
    "POST /api/kobble/explorations/make": button((body) => ({
      board: prototypes.make(
        explorationOf(store(), id(body)),
        field(body, "choice"),
        [key(body)],
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
    // Handed off, the exploration is done: its prototypes stop.
    "POST /api/kobble/explorations/hand-off": button(
      async (body) => await on.handOffNow(id(body)),
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

// The spec written at hand-off, by Claude Code reading the project.
function writerOf(
  options: Options,
  onActivity: (line: string) => void,
): SpecWriter {
  return specWriter({
    claude: options.claude,
    project: options.project,
    root: options.root,
    store: options.store,
    onActivity,
  });
}

type HandOffNow = (id: string) => Promise<{ issue: number; url: string }>;

// What Sprocket hands on to the other kobolds, and where it takes the
// person. Sprocket does nothing alone: a new idea goes to Doodle (an
// exploration, started), a word on an exploration to Doodle there, a
// persona's mission to the tester, a signal to the builder (a card) or to
// Doodle (an exploration), a stuck card's answer to the builder
// (card-look.ts). Each hand-off moves the person to where that kobold
// works, so they carry on with it there.

import type { KobbleStore } from "@software-factory/core";

import type { Cards } from "../cards/cards.ts";
import { Refused } from "../refused.ts";
import { exploreSignal, fixSignal } from "./actions.ts";
import { newExploration, startExploration } from "./explorations/actions.ts";

export type SupportHands = {
  // An idea to Doodle: a new exploration, started; its address.
  idea: (args: { title: string; problem: string; persona?: string }) => string;
  // The person's words to Doodle on an exploration there is; its address.
  tellDoodle: (exploration: string, words: string) => string;
  // A persona sent on a mission by the tester; the persona's tests.
  mission: (persona: string, task: string) => string;
  // A signal to the builder (a card) or to Doodle (an exploration).
  signal: (id: string, to: "builder" | "doodle") => Promise<string>;
};

// What the hands reach: the records, Doodle's talks, the tester, the board.
export type HandsOn = {
  store: () => KobbleStore;
  talks: {
    begin: (id: string) => Promise<void>;
    say: (id: string, text: string) => Promise<void>;
  };
  tests: { start: (body: unknown) => { persona: string } };
  cards: () => Cards;
  // Told to the page: what of Kobble changed.
  changed: (what: string) => void;
};

export function supportHands(on: HandsOn): SupportHands {
  return {
    idea: (args) => {
      const exploration = newExploration(on.store(), args);
      startExploration(on.store(), exploration.id);
      void on.talks.begin(exploration.id);
      on.changed("explorations");
      return explorationHash(exploration.id);
    },
    tellDoodle: (exploration, words) => {
      if (!on.store().get("explorations", exploration))
        throw new Refused(`There is no exploration “${exploration}”.`);
      startExploration(on.store(), exploration);
      void on.talks.say(exploration, `(Passed on by Sprocket.) ${words}`);
      on.changed("explorations");
      return explorationHash(exploration);
    },
    mission: (persona, task) => {
      const test = on.tests.start({ persona, task });
      on.changed("tests");
      return `#personas/${encodeURIComponent(test.persona)}/tests`;
    },
    signal: async (id, to) => {
      if (to === "builder") {
        await fixSignal(on.store(), id, on.cards);
        on.changed("signals");
        return "#build";
      }
      const { exploration } = exploreSignal(on.store(), id);
      on.changed("signals");
      on.changed("explorations");
      return explorationHash(exploration.id);
    },
  };
}

// The explorations, for Sprocket to find the one meant: id, title, where
// it is.
export function explorationsText(store: KobbleStore): string {
  const all = store.all("explorations");
  if (all.length === 0) return "No explorations yet.";
  return all
    .map((one) => `- ${one.id}: ${one.title} (${one.status})`)
    .join("\n");
}

// The new signals, waiting to be sorted on: id, what kind, what it says.
export function signalsText(store: KobbleStore): string {
  const fresh = store.all("signals").filter((one) => one.status === "new");
  if (fresh.length === 0) return "No new signals.";
  return fresh
    .map((one) => `- ${one.id} (${one.type}): ${one.text}`)
    .join("\n");
}

function explorationHash(id: string): string {
  return `#explore/${encodeURIComponent(id)}`;
}

// The places Sprocket can take the person: a page, or something open in it
// (#explore/<id>, #personas/<id>, #team/<id>).
const PLACE =
  /^#(home|system|signals|explore|build|releases|personas|extensions|settings|team|connect)(\/[\w.~%/-]*)?$/;

export function placeOf(to: string): string {
  const place = to.trim();
  if (!PLACE.test(place))
    throw new Refused(
      `“${to}” is not a place in Kobble: say a page, like #explore or #build, or #explore/<id>.`,
    );
  return place;
}

// Explorations' plug into Sprocket: a new idea handed to Doodle (an
// exploration, started), one parked for later, a word passed to Doodle on
// an exploration there is. Heard only while Explorations is installed.

import type { KobbleStore } from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../../refused.ts";
import { newExploration, startExploration } from "./actions.ts";
import { handOff, type SupportPlug } from "../../kobble/support-plug.ts";

const idea = {
  title: z.string().min(1).describe("A few words."),
  problem: z
    .string()
    .describe("The problem it solves and for whom, two or three sentences."),
  persona: z
    .string()
    .optional()
    .describe("A persona's id, when one fits (list_personas)."),
};

export const exploreAt = (id: string) => `#explore/${encodeURIComponent(id)}`;

const GUIDE = `**Explorations** (\`#explore\`): an idea thought through with Doodle, the explorer kobold, on a whiteboard; Tinker, Doodle's maker, builds prototypes of it, and the one the team agrees on is handed off to the Factory as a card. A new idea or feature request (also a team's own extension, when Kobble cannot do something): say back the title and the problem, and once they agree, \`explore_with_doodle\` starts it with Doodle and takes them there. An idea only to keep for later: \`add_exploration\` parks it in Explorations › Waiting. Something to tell Doodle about an exploration there is (find it with \`list_explorations\`): \`tell_doodle\`. A prototype is asked for with Doodle, in the exploration.`;

type On = {
  store: () => KobbleStore;
  talks: {
    begin: (id: string) => Promise<void>;
    say: (id: string, text: string) => Promise<void>;
  };
  changed: (what: string) => void;
};

export function explorationsPlug(on: On): SupportPlug {
  return {
    extension: "explorations",
    pages: ["explore"],
    guide: GUIDE,
    handOffs: [
      listExplorations(on),
      exploreWithDoodle(on),
      parkIdea(on),
      tellDoodle(on),
    ],
  };
}

function listExplorations(on: On) {
  return handOff({
    name: "list_explorations",
    description: "The explorations there are: id, title, where they are.",
    run: () => {
      const all = on.store().all("explorations");
      return {
        said:
          all.length === 0
            ? "No explorations yet."
            : all
                .map((one) => `- ${one.id}: ${one.title} (${one.status})`)
                .join("\n"),
      };
    },
  });
}

function exploreWithDoodle(on: On) {
  return handOff({
    name: "explore_with_doodle",
    description:
      "Hands a new idea to Doodle: a new exploration, started, where Doodle opens the conversation; takes the person there. Only once they agreed to the title and the problem.",
    input: idea,
    run: (args) => {
      const made = newExploration(on.store(), args);
      startExploration(on.store(), made.id);
      void on.talks.begin(made.id);
      on.changed("explorations");
      return { said: "Handed to Doodle.", to: exploreAt(made.id) };
    },
  });
}

function parkIdea(on: On) {
  return handOff({
    name: "add_exploration",
    description:
      "Parks an idea for later as an exploration waiting in Explorations › Waiting, without starting it. Only once the team agreed to what you will add.",
    input: idea,
    run: (args) => {
      const made = newExploration(on.store(), args);
      on.changed("explorations");
      return {
        said: `Added ${made.id} “${made.title}”, waiting in Explorations.`,
      };
    },
  });
}

function tellDoodle(on: On) {
  return handOff({
    name: "tell_doodle",
    description:
      "Passes the person's words to Doodle on an exploration there is, and takes them there to carry on with Doodle.",
    input: {
      exploration: z.string().describe("Its id, from list_explorations."),
      words: z.string().min(1).describe("What they want Doodle to hear."),
    },
    run: ({ exploration, words }) => {
      if (!on.store().get("explorations", exploration))
        throw new Refused(`There is no exploration “${exploration}”.`);
      startExploration(on.store(), exploration);
      void on.talks.say(exploration, `(Passed on by Sprocket.) ${words}`);
      on.changed("explorations");
      return { said: "Told Doodle.", to: exploreAt(exploration) };
    },
  });
}

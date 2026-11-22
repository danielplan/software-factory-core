// Kobble's own pieces, as extensions: what each brings (its page, its Home
// blocks, its kobold) and what it needs. They are installed in every
// factory unless the company removes one; Factory is always needed, as it
// builds everything. Their names and lines are words, kept in the page's
// catalogue by id.

import { defineExtension, type Extension } from "@software-factory/core";

const kobble = (
  id: string,
  name: string,
  about: string,
  more: Partial<Parameters<typeof defineExtension>[0]> = {},
) => defineExtension({ id, name, about, core: true, ...more });

export const KOBBLE_EXTENSIONS: Extension[] = [
  kobble("factory", "Factory", "The board where work is built.", {
    always: true,
    slots: ["code", "tasks"],
    brings: {
      pages: ["build"],
      blocks: ["status", "waiting", "loop", "reviews"],
      kobolds: ["builder"],
    },
    stages: [
      {
        id: "build",
        name: "Factory",
        after: ["signals", "explore"],
        before: ["done"],
      },
      { id: "done", name: "Done", after: ["build"] },
    ],
  }),
  kobble("explorations", "Explorations", "Explore an idea before building.", {
    needs: ["factory"],
    brings: {
      pages: ["explore"],
      blocks: ["exploring"],
      kobolds: ["explorer"],
    },
    stages: [
      {
        id: "explore",
        name: "Explorations",
        after: ["signals"],
        before: ["build", "done"],
      },
    ],
  }),
  kobble("signals", "Signals", "What the live app reports.", {
    brings: {
      pages: ["signals"],
      blocks: ["signals"],
      kobolds: ["sorter"],
    },
    stages: [
      {
        id: "signals",
        name: "Signals",
        before: ["explore", "build", "done"],
      },
    ],
  }),
  kobble("personas", "Personas", "Made-up customers who try the app.", {
    needs: ["signals"],
    brings: { pages: ["personas"], kobolds: ["tester"] },
  }),
  kobble("releases", "Releases", "Numbers and notes for each release.", {
    needs: ["factory"],
    slots: ["code"],
    brings: { pages: ["releases"] },
    stages: [{ id: "release", name: "Release", after: ["done"] }],
  }),
];

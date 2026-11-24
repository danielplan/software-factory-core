// A made-up exploration, only to try how a prototype's card looks: two
// prototypes, one running (with its variants and made-up data) and one being
// made. Opens at #explore/made-up. Nothing in it is real.

import type { ExplorationPage } from "@/api/client";

export const MADE_UP_ID = "made-up";

const PROTOTYPE = {
  agreed: false,
  place: null,
  by: "kobold" as const,
  kind: "prototype" as const,
  branch: "proto/made-up",
  tests: [],
};

const VARIANTS = [
  {
    key: "A",
    name: "Toolbar under the header",
    difference: "One row of letters and the shown variant's name",
  },
  {
    key: "B",
    name: "Browser-like tab bar",
    difference: "Tabs sit on the prototype's top edge, joined to it",
  },
  {
    key: "C",
    name: "Controls under the prototype",
    difference: "One slim row at the screen's foot, like a video player",
  },
];

const RUN = {
  idea: "made-up",
  making: false,
  activity: null,
  since: null,
  steps: [],
  problem: null,
  start: null,
};

// The running one shows this page itself, as the screen.
export const MADE_UP_PAGE: ExplorationPage = {
  exploration: {
    id: MADE_UP_ID,
    title: "Made-up exploration (to try the prototype card)",
    status: "exploring",
    personas: [],
    signals: [],
    heard: [],
    problem: "Made up: nobody said this.",
    created: "2026-01-01T09:00:00.000Z",
    work: null,
  },
  personas: [],
  heard: [],
  board: {
    things: [
      {
        ...PROTOTYPE,
        id: "prototype-a",
        key: "A",
        name: "Made-up page, running",
        difference: "Made up",
        variants: VARIANTS,
        states: ["empty", "loading", "problem", "long names"],
        opens: "/",
      },
      {
        ...PROTOTYPE,
        id: "prototype-b",
        key: "B",
        name: "Made-up page, being made",
        difference: "Made up",
        variants: VARIANTS,
        states: ["empty"],
      },
    ],
    links: [],
  },
  runs: [
    { ...RUN, version: "A", state: "running", url: `${location.origin}/` },
    {
      ...RUN,
      version: "B",
      state: "stopped",
      making: true,
      url: null,
      activity: "Changing the toolbar's spacing",
      since: new Date(Date.now() - 95_000).toISOString(),
    },
  ],
  tests: {},
  talk: {
    messages: [{ from: "kobold", text: "Made up: try the prototype cards." }],
    writing: null,
    activity: null,
    problem: null,
    pointed: null,
  },
  handingOff: null,
};

// The kobolds, one for each kind of work Kobble does, each with the hat of
// its job: the support kobold always at the bottom of the page, the
// explorer on an exploration's canvas, the builder on the Factory board,
// the tester who plays a persona, and the sorter of what comes in. The support kobold carries the factory's
// kobold name (lib/brand.ts).

import type { PersonaHat } from "@/api";
import type { Page } from "@/lib/routes";

export type KoboldId = "support" | "explorer" | "builder" | "tester" | "sorter";

export type Kobold = {
  id: KoboldId;
  name: string;
  job: string;
  hat: PersonaHat | "flop";
  color: string;
  // Where it works; none for the support kobold, which is on every page.
  page: Page | null;
};

export const KOBOLDS: Kobold[] = [
  {
    id: "support",
    name: "Sprocket",
    job: "Answers your questions, on every page",
    hat: "flop",
    color: "#3156d8",
    page: null,
  },
  {
    id: "explorer",
    name: "Doodle",
    job: "Thinks explorations through and makes prototypes",
    hat: "beret",
    color: "#e9a23b",
    page: "explore",
  },
  {
    id: "builder",
    name: "Bolt",
    job: "Builds the agreed cards on the Factory board",
    hat: "trucker",
    color: "#1f9a6e",
    page: "build",
  },
  {
    id: "tester",
    name: "Mimic",
    job: "Uses the app as one of your personas",
    hat: "cap",
    color: "#e64f86",
    page: "personas",
  },
  {
    id: "sorter",
    name: "Sieve",
    job: "Sorts the signals that come in",
    hat: "phones",
    color: "#0f7f8c",
    page: "signals",
  },
];

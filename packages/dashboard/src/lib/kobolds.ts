// The kobolds, one for each kind of work Kobble does, each with the hat of
// its job: the support kobold always at the bottom of the page, the
// explorer on an exploration's canvas, the builder on the Factory board,
// the tester who plays a persona, and the sorter of what comes in. The support kobold carries the factory's
// kobold name (lib/brand.ts).

import type { PersonaHat } from "@/api/client";
import type { Page } from "@/lib/routes";

export type KoboldId = "support" | "explorer" | "builder" | "tester" | "sorter";

export type Kobold = {
  id: KoboldId;
  name: string;
  hat: PersonaHat | "flop";
  color: string;
  // Where it works; none for the support kobold, which is on every page.
  page: Page | null;
};

// Doodle's helper who builds an exploration's prototypes, one at work on
// each prototype being made: shown on its card, not in the sidebar.
export const MAKER = {
  name: "Tinker",
  hat: "toque",
  color: "#4f6bed",
} as const;

export const KOBOLDS: Kobold[] = [
  {
    id: "support",
    name: "Sprocket",
    hat: "flop",
    color: "#3156d8",
    page: null,
  },
  {
    id: "explorer",
    name: "Doodle",
    hat: "beret",
    color: "#e9a23b",
    page: "explore",
  },
  {
    id: "builder",
    name: "Bolt",
    hat: "trucker",
    color: "#1f9a6e",
    page: "build",
  },
  {
    id: "tester",
    name: "Mimic",
    hat: "cap",
    color: "#e64f86",
    page: "testing",
  },
  {
    id: "sorter",
    name: "Sieve",
    hat: "phones",
    color: "#0f7f8c",
    page: "signals",
  },
];

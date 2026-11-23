// What the conversation's kobold may have made, and how: the prototypes'
// makers and the hand-off, as the explorations' routes give them to it.

import type { Way } from "./deeper.ts";
import type { ChangeStart } from "./prototypes.ts";

export type Makers = {
  // What the exploration's prototypes being made do now.
  making: (id: string) => string[];
  make: (id: string, choice: string, options: string[], opens?: string) => void;
  // A prototype changed in its copy (now, or once its maker is done);
  // another way added as a variant (its letter).
  change: (id: string, prototype: string, change: string) => ChangeStart;
  another: (id: string, prototype: string, way: Way) => string;
  // The kept variant as the base, new ones refining it (their letters).
  deeper: (
    id: string,
    prototype: string,
    keep: string,
    ways: Way[],
  ) => string[];
  // Hands the exploration off, as the Hand off button does.
  handOff: (id: string) => Promise<string>;
};

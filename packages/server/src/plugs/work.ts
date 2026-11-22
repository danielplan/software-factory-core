// The `work` plug, offered by the Factory: the connected board's work as
// the builder last read it, an answer on a stuck card, and the board read
// again. Used by the core (the page's state, updates, Sprocket's card
// look), Explorations (the board's ideas) and Signals (where a fix is).

import type { WorkView } from "../api.ts";

// An idea waiting on the board (its Backlog), not explored yet.
export type BoardIdea = { number: number; title: string; url: string };

export type WorkPlug = {
  // None without a connected board.
  view: () => WorkView | null;
  // The owner's answer on a stuck card, handed back to the builder;
  // refused without a board.
  answer: (number: number, text: string) => Promise<void>;
  refresh: () => void;
  // The board's ideas: open cards in its Backlog or in no column.
  ideas: () => BoardIdea[];
  // The column of an issue ("#41") on the board, in words; none when the
  // board does not show it.
  column: (issue: string) => string | null;
};

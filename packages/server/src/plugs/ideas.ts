// The `ideas` plug, offered by Explorations: an idea handed to it (from a
// signal, from setup), and the explorations there are. Used by Signals
// (Explore, and the "already" check), the core's setup, Personas (a
// mission on a prototype) and the Factory (the cards explorations became).

import type { Exploration, KobbleSignal } from "@software-factory/core";

export type Idea = {
  title: string;
  problem: string;
  // A persona's id, when one fits.
  persona?: string;
};

export type IdeasPlug = {
  // Every exploration, in the order of their ids.
  all: () => Exploration[];
  // A new idea, waiting to be explored; refused with why when it does not
  // fit.
  take: (idea: Idea) => Exploration;
  // A signal heard, as an idea: added to the open exploration its "already"
  // check found, or a new one, waiting. The exploration keeps its own copy
  // of what the signal says.
  hear: (signal: KobbleSignal) => Exploration;
  // Where an exploration is on the page (#explore/X-3).
  address: (id: string) => string;
  // The address of a prototype, by its branch, opened for a persona: where
  // a persona's mission on it runs.
  prototype: (branch: string, persona: string) => Promise<string>;
  // The board's cards explorations were handed off as: the card's number,
  // the exploration, its title, and the key of the prototype agreed (none
  // without one).
  handedOff: () => HandedOff[];
};

export type HandedOff = {
  work: number;
  exploration: string;
  title: string;
  key: string | null;
};

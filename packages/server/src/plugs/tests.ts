// The `tests` plug, offered by Testing: the tests there are, the ones going
// on now, and a new one, also on a prototype's branch. Used by Explorations
// (a prototype's tests) and Signals (the tests going on now).

import type { Face, PersonaTest } from "@software-factory/core";

// A persona in a test now (or waiting for their turn), and the moment they
// are at.
export type TestNow = {
  id: string;
  persona: string;
  name: string;
  face: Face;
  status: PersonaTest["status"];
  doing: string | null;
};

export type TestsPlug = {
  // The tests with these ids, in the order they were started.
  of: (ids: string[]) => PersonaTest[];
  // The tests running or waiting now.
  now: () => TestNow[];
  // A persona tries one thing, on a prototype's branch (or the app as it
  // is): a test of one day with that as its only situation. It waits its
  // turn and runs in the background.
  start: (test: { persona: string; task: string; on?: string }) => PersonaTest;
};

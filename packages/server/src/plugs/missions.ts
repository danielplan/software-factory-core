// The `missions` plug, offered by Personas: the persona tests (missions)
// run, and a new one, also on a prototype's branch. Used by Explorations (a
// prototype's tests) and Signals (the missions going on now).

import type { Face, PersonaTest } from "@software-factory/core";

// A persona on a mission now (or waiting for its turn), and the step it is
// on.
export type MissionNow = {
  id: string;
  persona: string;
  name: string;
  face: Face;
  status: PersonaTest["status"];
  doing: string | null;
};

export type MissionsPlug = {
  // The missions with these ids, in the order they were started.
  of: (ids: string[]) => PersonaTest[];
  // The missions running or waiting now.
  now: () => MissionNow[];
  // A persona's task, on a prototype's branch (or the app as it is); it
  // waits its turn and runs in the background.
  start: (mission: {
    persona: string;
    task: string;
    on?: string;
  }) => PersonaTest;
};

// The `personas` plug, offered by Personas: the personas there are, and a
// new one. Used by Explorations (who an idea is for, a world's situation),
// Signals (a persona's name and face on a row), the feedback board and the
// core's setup.

import type { KobblePersona } from "@software-factory/core";

export type PersonasPlug = {
  all: () => KobblePersona[];
  get: (id: string) => KobblePersona | null;
  // A persona the team describes ({name, place, about}), with an id made
  // from the name; refused with why when it does not fit.
  add: (persona: unknown) => KobblePersona;
};

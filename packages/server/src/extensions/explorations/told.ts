// The conversation told of its prototypes.

import type { ExplorationPrototypes } from "./prototypes.ts";
import type { ExplorationTalks } from "./talks.ts";

// A prototype made: the kobold reviews it; one that could not be: it says
// so instead of promising it.
export function toldOfPrototypes(
  prototypes: ExplorationPrototypes,
  talks: ExplorationTalks,
): void {
  prototypes.whenDone({
    ready: (id, key, made) => {
      talks.review(id, key, made);
    },
    failed: (id, key, why) => {
      talks.failed(id, key, why);
    },
  });
}

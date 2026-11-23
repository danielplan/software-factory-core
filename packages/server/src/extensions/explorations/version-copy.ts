// Where a prototype's version is: its copy of the code on its branch, told
// where the exploration's made-up world answers when the project has one.

import type { KobbleStore } from "@software-factory/core";

import { type PrototypeCopy, versionCopy } from "../../prototypes/copies.ts";
import { Refused } from "../../refused.ts";
import { prototypeOf } from "./versions.ts";
import type { ExplorationWorlds } from "./worlds.ts";

export function copyOfVersion(
  on: {
    project: string;
    store: () => KobbleStore;
    worlds: ExplorationWorlds;
  },
  worldUrl: string,
  exploration: string,
  key: string,
): PrototypeCopy {
  const made = prototypeOf(on.store().board(exploration), key);
  if (!made) throw new Refused(`${exploration} has no prototype ${key} yet.`);
  const copy = versionCopy(on.project, exploration, key, made.branch);
  return worldUrl && on.worlds.offered()
    ? {
        ...copy,
        env: {
          ...copy.env,
          FACTORY_WORLD_URL: `${worldUrl}/${exploration}`,
        },
      }
    : copy;
}

// Updates in the factory: the owner's folder follows GitHub's main (see
// project-updates.ts), looked at every few minutes once a factory is open;
// after an update, the products that run are started again with the new
// version. Workshop shows it and has its buttons.

import {
  chooseUpdatesByItself,
  FACTORY_FOLDER,
  hasFactory,
  updatesByItself,
} from "@software-factory/core";
import { join } from "node:path";

import type { Route } from "../add-ons/add-on.ts";
import { on } from "../asked.ts";
import { type Git, ProjectUpdates } from "./project-updates.ts";

export type UpdatesOptions = {
  project: string;
  // The products that run now, to start again after an update.
  restartRunning: () => Promise<void>;
  onChange: () => void;
  git?: Git;
  everyMs?: number;
};

export function servedUpdates(options: UpdatesOptions) {
  const factory = join(options.project, FACTORY_FOLDER);
  const updates = new ProjectUpdates({
    root: options.project,
    choice: {
      read: () => hasFactory(factory) && updatesByItself(factory),
      write: (yes: boolean) => {
        chooseUpdatesByItself(factory, yes);
      },
    },
    ...(options.git ? { git: options.git } : {}),
  });
  updates.subscribe(() => {
    options.onChange();
  });
  const update = async () => {
    const outcome = await updates.update();
    if (outcome.kind === "updated") await options.restartRunning();
    return outcome;
  };
  let stop = () => {};
  const routes: Record<string, Route> = {
    "GET /api/updates": () => updates.state,
    "POST /api/updates/look": () => updates.look(),
    "POST /api/updates/update": () => update(),
    "POST /api/updates/by-itself": (body) => {
      updates.chooseByItself(on(body));
    },
  };
  return {
    routes,
    start: () => {
      if (!hasFactory(factory)) return;
      void updates.look();
      stop = updates.follow(options.everyMs);
    },
    close: () => {
      stop();
    },
  };
}

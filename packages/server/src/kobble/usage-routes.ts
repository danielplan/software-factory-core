// Kobble's records with the usage log: the store that also writes every
// change down when the log is on, and Open with a picture of the prototype.

import { hasFactory, KobbleStore, usageFolder } from "@software-factory/core";

import type { Route } from "../add-ons/add-on.ts";
import { Refused } from "../refused.ts";
import type { ExplorationPrototypes } from "./explorations/prototypes.ts";
import type { servedExplorations } from "./explorations/routes.ts";
import { LoggedStore } from "./logged-store.ts";
import { UsageLog } from "./usage-log.ts";
import { pictureOfPrototype } from "./usage-pictures.ts";

// Open, and, with the usage log on, a picture of the prototype once it runs.
export function withPicture(
  explorations: {
    routes: Record<string, Route>;
    prototypes: ExplorationPrototypes;
  },
  usage: () => UsageLog | null,
): Route {
  const { prototypes } = explorations;
  const open = explorations.routes["POST /api/kobble/explorations/open"];
  return async (body, url) => {
    if (!open) throw new Refused("There is nothing to open.");
    const answer = await open(body, url);
    const log = usage();
    const asked = body as { id?: unknown; key?: unknown } | null;
    if (log && typeof asked?.id === "string" && typeof asked.key === "string") {
      const { id, key } = asked as { id: string; key: string };
      void pictureOfPrototype({
        usage: log,
        exploration: id,
        key,
        address: () => prototypes.address(id, key),
      });
    }
    return answer;
  };
}

// The usage log, when it is switched on.
export function usageOf(factory: string, project: string): UsageLog | null {
  const folder = usageFolder(factory, project);
  return folder ? new UsageLog(folder) : null;
}

// The records once the factory is there (none in setup); every change also
// goes to the usage log when it is on.
export function storeOf(factory: string, project: string): KobbleStore | null {
  if (!hasFactory(factory)) return null;
  const log = usageOf(factory, project);
  return log
    ? new LoggedStore(factory, project, log)
    : new KobbleStore(factory);
}

// The explorations' routes, Test among them, and Open with its picture.
export function explorationRoutes(
  explorations: ReturnType<typeof servedExplorations>,
  tests: Parameters<ReturnType<typeof servedExplorations>["testRoute"]>[0],
  usage: () => UsageLog | null,
): Record<string, Route> {
  return {
    ...explorations.routes,
    "POST /api/kobble/explorations/open": withPicture(explorations, usage),
    "POST /api/kobble/explorations/test": explorations.testRoute(tests),
  };
}

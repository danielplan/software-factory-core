// Open with a picture of the prototype, for the usage log when the company
// switched it on.

import type { Route } from "../../http.ts";
import { Refused } from "../../refused.ts";
import type { ExplorationPrototypes } from "./prototypes.ts";
import type { servedExplorations } from "./routes.ts";
import type { UsageLog } from "../../kobble/usage-log.ts";
import { pictureOfPrototype } from "../../kobble/usage-pictures.ts";

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

// The explorations' routes, Test among them, and Open with its picture.
export function explorationRoutes(
  explorations: ReturnType<typeof servedExplorations>,
  usage: () => UsageLog | null,
): Record<string, Route> {
  return {
    ...explorations.routes,
    "POST /api/kobble/explorations/open": withPicture(explorations, usage),
    "POST /api/kobble/explorations/test": explorations.testRoute,
  };
}

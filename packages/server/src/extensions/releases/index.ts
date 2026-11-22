// Releases: numbers and notes for each release of the products, written
// from what was merged since the last one. The release is made where the
// code lives, through the GitHub CLI; the repository is the one the board
// where work is tracked names.

import { defineExtension } from "@software-factory/core";

import type { Host, Served } from "../../plugs/extension.ts";
import { releasesRoutes } from "./routes.ts";
import { releasesPlug } from "./support.ts";

export const extension = defineExtension({
  id: "releases",
  name: "Releases",
  about: "Numbers and notes for each release.",
  core: true,
  needs: ["factory"],
  slots: ["code"],
  brings: { pages: ["releases"] },
  stages: [{ id: "release", name: "Release", after: ["done"] }],
});

export function serve(host: Host): Served {
  return {
    routes: releasesRoutes({
      project: host.project,
      cli: host.cli,
      boards: host.slots.tasks,
      claude: host.claude,
      changed: host.changed,
    }),
    support: () => releasesPlug,
  };
}

// Releases' plug into Sprocket: no hand-off (a release is the team's to
// make, on its page), only what Sprocket should know and where to take
// them. Heard only while Releases is installed.

import type { SupportPlug } from "../../kobble/support-plug.ts";

export const releasesPlug: SupportPlug = {
  extension: "releases",
  pages: ["releases"],
  guide:
    "**Releases** (`#releases`): numbers and notes for each release of the products, written from what was merged. Making one is the team's: take them there with `go_to` and say to press Prepare the release, then Make it.",
  handOffs: [],
};

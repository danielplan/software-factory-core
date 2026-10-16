// The trackers' names.

import type { Company } from "@/api";

export const TRACKER_NAMES: Record<Company["tracker"], string> = {
  none: "The factory's board",
  github: "GitHub board",
  jira: "Jira Cloud",
};

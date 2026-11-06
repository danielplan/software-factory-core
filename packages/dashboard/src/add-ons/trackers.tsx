import type { ComponentType } from "react";

import type { AddOnView } from "@/api";

import { GitHubSteps } from "./github/steps";
import { JiraSteps } from "./jira/steps";

// The page's part of each tracker add-on, by its id: the steps that
// connect its board (the add-on's routes check each).
export const TRACKER_STEPS: Record<
  string,
  ComponentType<{ onDone: (message: string) => void }> | undefined
> = { github: GitHubSteps, jira: JiraSteps };

// The add-ons that track work: the boards that can be connected. Only the
// one in use is on; another is switched on when it is chosen.
export function trackersOf(addOns: AddOnView[]): AddOnView[] {
  return addOns.filter((addOn) => addOn.tracker);
}

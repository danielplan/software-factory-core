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

// The add-ons that are on and track work: the boards to connect.
export function onTrackers(addOns: AddOnView[]): AddOnView[] {
  return addOns.filter((addOn) => addOn.on && addOn.tracker);
}

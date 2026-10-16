import { GitBranch, SquareKanban } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { GitHubSteps } from "./github/steps";
import { JiraSteps } from "./jira/steps";

// The page's part of each tracker add-on, by its id: its icon, and the
// steps that connect its board (the add-on's routes check each).
export const TRACKER_STEPS: Record<
  string,
  | {
      icon: ReactNode;
      Steps: ComponentType<{ onDone: (message: string) => void }>;
    }
  | undefined
> = {
  github: { icon: <GitBranch aria-hidden />, Steps: GitHubSteps },
  jira: { icon: <SquareKanban aria-hidden />, Steps: JiraSteps },
};

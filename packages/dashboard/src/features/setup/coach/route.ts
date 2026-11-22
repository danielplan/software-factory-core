import { createContext } from "react";

// Where a conversation with a coach sends the owner's words and changes to
// its map: the setup coach's by default, or one idea's (with its id).
export type CoachRoute = {
  say: string;
  draft: string;
  with: Record<string, string>;
};

export const SETUP_ROUTE: CoachRoute = {
  say: "/api/setup/say",
  draft: "/api/setup/draft",
  with: {},
};

export const CoachRouteContext = createContext<CoachRoute>(SETUP_ROUTE);

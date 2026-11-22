// Prototype: the steps on the left of setting up, once the path is settled
// (new or existing). Before it, only the welcome.

import type { Step } from "./steps";

const step = (id: string, name: string, hint: string): Step => ({
  id,
  name,
  hint,
  area: null,
});

const WELCOME = step("start-welcome", "Welcome", "New or existing");

const NEW: Step[] = [
  WELCOME,
  step("new-idea", "The idea", "A short interview"),
  step("new-apps", "Your apps", "Made from the kits’ starters, running"),
  step("new-people", "Who it’s for", "The people you build for"),
  step("new-team", "Team", "Who works on it"),
  step("new-look", "The look", "Colours and corners"),
  step("new-first", "First exploration", "Tinker’s first prototype"),
];

const EXISTING: Step[] = [
  WELCOME,
  step("old-read", "Reading your code", "The kobold reads, you watch"),
  step("old-apps", "Your apps", "Confirm each one"),
  step("old-checks", "Checks", "What passes, how it differs from its kit"),
  step("old-bring", "Bring over", "Your docs and backlog"),
  step("old-team", "Team and board", "Who works on it, where"),
  step("old-look", "The look", "From your app"),
  step("old-home", "Home", "With what was found"),
];

export function startSteps(path: "new" | "existing" | null): Step[] {
  if (path === "new") return NEW;
  if (path === "existing") return EXISTING;
  return [WELCOME];
}

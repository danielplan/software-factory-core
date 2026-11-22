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

// The steps both paths share: the same names and hints, except for the bit
// that is true of one path only (the team's board, what is made and shown).
const people = step("shared-people", "Who it’s for", "The people you build for");
const team = (hint: string) => step("shared-team", "Team", hint);
const setUp = (hint: string) => step("shared-set-up", "Set up", hint);

const NEW: Step[] = [
  WELCOME,
  step("new-idea", "The idea", "One sentence, whose problem, out of scope"),
  step("new-apps", "Your apps", "Proposed, you confirm"),
  people,
  team("Who works on it"),
  setUp("Kobble writes it all, makes the apps and shows them running"),
  step(
    "new-first",
    "First exploration",
    "Tinker’s first prototype, with the look chosen there",
  ),
];

const EXISTING: Step[] = [
  WELCOME,
  step("old-read", "Reading your code", "The kobold reads, you watch"),
  step("old-apps", "Your apps", "Confirm each one"),
  step("old-checks", "Checks", "What passes, how it differs from its kit"),
  step("old-look", "The look", "From your app"),
  people,
  team("Who works on it, and the board"),
  setUp("Kobble writes it all"),
  step("old-bring", "Bring over", "Your docs and backlog, onto the board"),
  step("old-home", "Home", "With what was found"),
];

export function startSteps(path: "new" | "existing" | null): Step[] {
  if (path === "new") return NEW;
  if (path === "existing") return EXISTING;
  return [WELCOME];
}

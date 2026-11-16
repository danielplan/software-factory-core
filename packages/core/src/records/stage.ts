// The stage a problem is at, worked out from the records and, when the
// board is known, which of its issues are in the app; never stored:
//
//   Heard (or Assumed, for a problem assumed from an idea) → Trying ideas
//   → Building → In the app → Solved, or Didn't work at the end.
//
// - Solved: a ticket for it was answered "yes, it worked".
// - In the app: a ticket for it, not answered yes or no, is closed or in
//   the board's last column ("In the app"), or was answered "didn't check".
// - Building: a ticket for it is open, not answered.
// - Trying ideas: an idea for it is being explored (versions or not).
// - Didn't work: a ticket for it was answered no, or an idea for it did not
//   work, and nothing else for it is under way.
// - Heard: none of these yet (Assumed when it came from an idea).

import type { Outcome, Problem, Records } from "./schemas.ts";

export const PROBLEM_STAGES = [
  "assumed",
  "heard",
  "trying",
  "building",
  "inApp",
  "solved",
  "didntWork",
] as const;
export type ProblemStage = (typeof PROBLEM_STAGES)[number];

export function problemStage(
  problem: Problem,
  records: Records,
  ideas: Record<string, string>,
  inApp: ReadonlySet<number>,
): ProblemStage {
  const answers = new Map<number, Outcome["worked"]>(
    records.outcomes.map((o) => [o.issue, o.worked]),
  );
  const tickets = records.ticketLinks.filter((t) =>
    t.problems.includes(problem.id),
  );
  const worked = tickets.map((t) => answers.get(t.issue));
  if (worked.includes("yes")) return "solved";
  const open = tickets.filter((t) => answers.get(t.issue) !== "no");
  if (open.some((t) => inApp.has(t.issue) || answers.get(t.issue)))
    return "inApp";
  if (open.length > 0) return "building";
  const forIt = records.ideas.filter((idea) =>
    idea.problems.includes(problem.id),
  );
  if (forIt.some((idea) => ideas[idea.id] === "exploring")) return "trying";
  if (
    worked.includes("no") ||
    forIt.some((idea) => ideas[idea.id] === "didntWork")
  )
    return "didntWork";
  return problem.assumed ? "assumed" : "heard";
}

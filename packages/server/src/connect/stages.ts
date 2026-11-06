// The stages the factory's work goes through, and which column of a
// connected board (a GitHub board's Status, a Jira project's statuses)
// each one is: suggested from the columns' names, checked by the owner.

import { type Stage, type StageMap, STAGES } from "../api.ts";

// Each stage as a column on a board the factory makes, with what it means.
export const STAGE_COLUMNS: Record<Stage, { title: string; about: string }> = {
  backlog: { title: "Backlog", about: "Agreed, not planned yet." },
  planning: { title: "Planning", about: "Its plan is talked through." },
  todo: { title: "To do", about: "Planned: the go-ahead to build it." },
  doing: { title: "In progress", about: "The factory builds it." },
  review: { title: "Review", about: "Built: waiting for a review." },
  done: { title: "Done", about: "Merged or closed." },
};

// Words that name each stage on most boards; the first that fits wins.
const WORDS: [Stage, RegExp][] = [
  ["done", /\b(done|closed|complete|completed|shipped|released|resolved)\b/i],
  ["review", /\b(review|reviewing|qa|test|testing|verify|staging|accept)/i],
  ["doing", /\b(in ?progress|doing|develop|building|working|wip|active)\b/i],
  [
    "planning",
    /\b(planning|plan|refine|refinement|shaping|discuss|discussion)\b/i,
  ],
  ["todo", /\b(to ?do|ready|selected|planned|next|up next)\b/i],
  ["backlog", /\b(backlog|icebox|ideas?|triage|new|open)\b/i],
];

// For each stage, the column whose name says it ("" where none does); each
// column at most once.
export function suggestStages(columns: string[]): StageMap {
  const map: StageMap = {
    backlog: "",
    planning: "",
    todo: "",
    doing: "",
    review: "",
    done: "",
  };
  const used = new Set<string>();
  for (const [stage, words] of WORDS) {
    const column = columns.find((name) => !used.has(name) && words.test(name));
    if (column) {
      map[stage] = column;
      used.add(column);
    }
  }
  return map;
}

// The stages as asked, each "" or one of the board's columns; the
// suggestion where nothing was asked.
export function stagesFrom(asked: unknown, columns: string[]): StageMap {
  if (typeof asked !== "object" || asked === null)
    return suggestStages(columns);
  const given = asked as Record<string, unknown>;
  const map = suggestStages(columns);
  for (const stage of STAGES) {
    const value = given[stage];
    if (typeof value !== "string") continue;
    if (value !== "" && !columns.includes(value))
      throw new Error(`The board has no column “${value}”.`);
    map[stage] = value;
  }
  return map;
}

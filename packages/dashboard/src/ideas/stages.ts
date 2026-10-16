// The stages work goes through, each with its own colour: on the board's
// columns and on an idea's card.
export const STAGES = [
  { id: "draft", title: "Draft", colour: "#e2a13c" },
  { id: "ready", title: "Backlog", colour: "#64748b" },
  { id: "todo", title: "To do", colour: "#5b7cfa" },
  { id: "building", title: "In progress", colour: "#8b5cf6" },
  { id: "trying", title: "Review", colour: "#e0609a" },
  { id: "done", title: "Done", colour: "#2fb47c" },
] as const;

export function stageOf(status: string) {
  return STAGES.find((stage) => stage.id === status) ?? STAGES[0];
}

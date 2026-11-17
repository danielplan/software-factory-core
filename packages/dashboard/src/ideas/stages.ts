// The stages work goes through, each with its own colour: on the board's
// columns and on an idea's card. Each name is read in the dashboard's
// language when it is shown.

import { t } from "../i18n/i18n.ts";

const stage = <Id extends string>(id: Id, colour: string) => ({
  id,
  colour,
  get title(): string {
    return t(`build:stages.${id}` as "build:stages.draft");
  },
});

export const STAGES = [
  stage("draft", "#e2a13c"),
  stage("backlog", "#64748b"),
  stage("planning", "#14a3b8"),
  stage("todo", "#5b7cfa"),
  stage("doing", "#8b5cf6"),
  stage("review", "#e0609a"),
  stage("done", "#2fb47c"),
] as const;

export function stageOf(status: string) {
  return STAGES.find((one) => one.id === status) ?? STAGES[0];
}

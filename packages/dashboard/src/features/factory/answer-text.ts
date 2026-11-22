// The comment the owner sends from a waiting card: their own words, else
// the answer they picked ("**A**: With tax"); empty while neither.

import type { FactoryView } from "../../../../server/src/kobble/factory-view.ts";

export type Waiting = FactoryView["waiting"][number];

export function answerText(
  waiting: Waiting,
  picked: string | null,
  own: string,
): string {
  if (own.trim()) return own.trim();
  const answer = waiting.ask?.answers.find((one) => one.key === picked);
  return answer ? `**${answer.key}**: ${answer.answer}` : "";
}

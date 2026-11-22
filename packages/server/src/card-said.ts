// A card's number and the owner's words on it, as the Factory page sends
// them (an answer to the builder, or a question for it).

import { Refused } from "./refused.ts";

export function cardSaid(body: unknown, what: string): [number, string] {
  const sent = body as { number?: unknown; text?: unknown } | null;
  const number = Number(sent?.number);
  if (!Number.isInteger(number)) throw new Refused("Say which card.");
  if (typeof sent?.text !== "string") throw new Refused("Say which text.");
  const said = sent.text.trim();
  if (said === "") throw new Refused(`Write your ${what} first.`);
  return [number, said];
}

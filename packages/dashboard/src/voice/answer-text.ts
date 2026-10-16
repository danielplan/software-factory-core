// What of the coach's spoken answer can be said now, while it is still being
// written: plain rules, used by the call (call.ts).

import { type Language, LANGUAGES } from "./languages.ts";

// All of it once it is complete (a sentence of its own when the coach sent
// no spoken version and nothing was said yet), otherwise up to the last
// finished sentence.
export function sayable(
  text: string,
  final: boolean,
  said: string,
  language: Language,
): string {
  const answer =
    final && !text.trim() && !said ? LANGUAGES[language].nothingToSay : text;
  return final ? answer.trim() : readyToSay(answer);
}

// The coach's written reply as it sounds: Markdown marks, links' addresses
// and emoji are left out, since they are not said.
export function spoken(text: string): string {
  return (
    text
      // A link's address goes; its words stay (the bracket below).
      .replace(/\]\([^)\s]*\)/g, "")
      .replace(/[*_`#>[\]]/g, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\uFE0F/g, "")
      .split("\n")
      .map((line) => line.trim().replace(/^[-•] /, ""))
      .join("\n")
      .replace(/ {2,}/g, " ")
      .trim()
  );
}

// What of an answer being written can be said: up to its last full sentence.
export function readyToSay(text: string): string {
  const ends = [...text.matchAll(/[.!?…](?=\s)/g)];
  const last = ends.at(-1);
  return last ? text.slice(0, last.index + 1).trim() : "";
}

// The work on the board the factory is connected to, as cards, the same for
// any tracker (cards from a GitHub board, later Jira): listed with the
// factory's stage each is in, shown, moved, commented on, made, and given
// the plan the owner agreed to. The agreed plan lives in the card itself,
// between two marks, so whoever runs the factory (on another computer)
// reads it there.

import type { Stage } from "../api.ts";
import { STAGES } from "../api.ts";
import { STAGE_COLUMNS } from "../connect/stages.ts";

export type Card = {
  number: number;
  title: string;
  // The factory's stage its column is, if its column is one of them.
  stage: Stage | null;
  column: string;
  url: string;
  labels: string[];
  // Closed where it is tracked.
  closed: boolean;
};

export type CardDetail = Card & {
  body: string;
  // Whether the card carries an agreed plan.
  agreed: boolean;
  comments: { author: string; body: string; at: string }[];
};

export type Cards = {
  list: () => Promise<Card[]>;
  show: (number: number) => Promise<CardDetail>;
  move: (number: number, stage: Stage) => Promise<void>;
  comment: (number: number, text: string) => Promise<void>;
  create: (title: string, body: string) => Promise<Card>;
  // Writes the agreed plan into the card (replacing an earlier one).
  writePlan: (number: number, plan: string) => Promise<void>;
};

const START = "<!-- factory:agreed-plan -->";
const END = "<!-- /factory:agreed-plan -->";

// The card's text with the agreed plan in it, in place of an earlier one.
export function withPlan(body: string, plan: string): string {
  const section = `${START}\n## The agreed plan\n\n${plan.trim()}\n${END}`;
  const at = body.indexOf(START);
  const end = body.indexOf(END);
  if (at >= 0 && end > at)
    return body.slice(0, at) + section + body.slice(end + END.length);
  return body.trim() ? `${body.trimEnd()}\n\n${section}\n` : `${section}\n`;
}

// The agreed plan in a card's text; none when it has none.
export function planOf(body: string): string | null {
  const at = body.indexOf(START);
  const end = body.indexOf(END);
  if (at < 0 || end <= at) return null;
  return body.slice(at + START.length, end).trim();
}

// A stage as the owner or an agent names it: its id ("todo"), its title
// ("To do"), or "ready".
export function stageNamed(name: string): Stage | null {
  const wanted = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (wanted === "ready") return "todo";
  return (
    STAGES.find(
      (stage) =>
        stage === wanted || STAGE_COLUMNS[stage].title.toLowerCase() === wanted,
    ) ?? null
  );
}

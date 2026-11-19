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
  // The open cards it waits for (depends on): it is built after them.
  waitsFor: number[];
};

// Another card, as a relation names it.
export type Related = { number: number; title: string; closed: boolean };

export type CardDetail = Card & {
  body: string;
  // Whether the card carries an agreed plan.
  agreed: boolean;
  comments: { author: string; body: string; at: string }[];
  // The cards it depends on, and the cards that depend on it.
  dependsOn: Related[];
  neededBy: Related[];
};

export type Cards = {
  list: () => Promise<Card[]>;
  show: (number: number) => Promise<CardDetail>;
  move: (number: number, stage: Stage) => Promise<void>;
  comment: (number: number, text: string) => Promise<void>;
  // In the backlog unless a stage is said (To do: the go-ahead to build).
  create: (title: string, body: string, stage?: Stage) => Promise<Card>;
  // Writes the agreed plan into the card (replacing an earlier one).
  writePlan: (number: number, plan: string) => Promise<void>;
  // The card is built only after the other one (where it is tracked: GitHub's
  // "blocked by").
  dependOn: (number: number, on: number) => Promise<void>;
  // The card is not needed any more because the other one does it: closed,
  // with a note on both, so it stays findable.
  replace: (number: number, by: number) => Promise<void>;
  // What kind of work it is (a label where it is tracked); none takes it off.
  setType?: (number: number, type: CardType | null) => Promise<void>;
  // Not wanted any more: taken off the board and closed as not planned
  // where it is tracked, so it stays findable there.
  remove?: (number: number) => Promise<void>;
};

// What kind of work a card is, kept as a label ("type: bug").
export const CARD_TYPES = ["bug", "feature", "improvement"] as const;
export type CardType = (typeof CARD_TYPES)[number];
export const typeLabel = (type: CardType) => `type: ${type}`;

export function typeOf(labels: string[]): CardType | null {
  return CARD_TYPES.find((type) => labels.includes(typeLabel(type))) ?? null;
}

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
  if (at < 0 || end <= at) return headedPlan(body);
  return body.slice(at + START.length, end).trim();
}

// An earlier factory wrote the plan under its heading only: from there to
// the next heading of the same level.
const PLAN_HEADING = "## The agreed plan";

function headedPlan(body: string): string | null {
  const at = body.indexOf(`${PLAN_HEADING}\n`);
  if (at < 0) return null;
  const from = at + PLAN_HEADING.length;
  const next = body.indexOf("\n## ", from);
  const plan = (next < 0 ? body.slice(from) : body.slice(from, next)).trim();
  return plan || null;
}

// What a card asks for, without its agreed plan.
export function aboutOf(body: string): string {
  const at = body.indexOf(START);
  const cut = at >= 0 ? at : body.indexOf(`${PLAN_HEADING}\n`);
  return (cut >= 0 ? body.slice(0, cut) : body).trim();
}

// The word the factory uses for a stage when it speaks of it (the board's
// column may be named differently): "ready" for the cards the builder takes.
export function stageWord(stage: Stage): string {
  return stage === "todo" ? "Ready" : STAGE_COLUMNS[stage].title;
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

const TYPE_COLORS: Record<CardType, string> = {
  bug: "d73a4a",
  feature: "3156d8",
  improvement: "12a594",
};

// GitHub's command that makes the type's label (or updates its colour).
export function labelArgs(type: CardType, repo: string[]): string[] {
  return [
    "label",
    "create",
    typeLabel(type),
    ...repo,
    "--color",
    TYPE_COLORS[type],
    "--force",
  ];
}

// The label changes that give a card this type (none: no type).
export function typeEdit(labels: string[], type: CardType | null): string[] {
  const off = CARD_TYPES.filter(
    (other) => other !== type && labels.includes(typeLabel(other)),
  ).flatMap((other) => ["--remove-label", typeLabel(other)]);
  const on =
    type && !labels.includes(typeLabel(type))
      ? ["--add-label", typeLabel(type)]
      : [];
  return [...on, ...off];
}

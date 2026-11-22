// The board's cards as pieces of work: a card is the piece of work, and the
// only one for now. Its stage is where its board column puts it (Build until
// it is Done), or the team's stage that holds it; what it keeps of its piece
// of work (the checks that passed, its history) is in the card's text, and
// the team's stage that holds it is a label on it. The core's rules say when
// one may move (a stage's checks must have passed); this answers the page
// and the extensions' kobolds, keeps the moves on the card, and tells
// everyone who listens.
//
// Kobble's own stages stay as they are, with no checks: moving a card
// between the board's columns is the board's. A card in a team's stage that
// is moved to Done on the board is finished there.

import {
  type Course,
  DONE_STAGE,
  isHeld,
  type Kept,
  moveWork,
  type Moved,
  type OnBoard,
  type Outcome,
  openChecks,
  passCheck,
  pieceOf,
  type Work,
  cardCourse,
} from "@software-factory/core";

import type { Route } from "./http.ts";
import type { CardDetail, Cards } from "./cards/cards.ts";
import { Refused } from "./refused.ts";

const text = (value: unknown, what: string): string => {
  if (typeof value !== "string" || value.trim() === "")
    throw new Refused(`Say ${what}.`);
  return value.trim().slice(0, 200);
};

const settled = (outcome: Outcome): Work => {
  if ("refused" in outcome) throw new Refused(outcome.refused);
  return outcome.work;
};

const whoOf = (by: unknown): string =>
  typeof by === "string" && by.trim() ? by.trim().slice(0, 80) : "team";

const numberOf = (value: unknown): number => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0)
    throw new Refused("Say the number of the card.");
  return number;
};

// What the board says of a card, as the piece of work needs it.
export const onBoard = (card: {
  number: number;
  title: string;
  stage: string | null;
  closed: boolean;
  labels: string[];
}): OnBoard => ({
  number: card.number,
  title: card.title,
  // Done is the board's stage and the piece of work's alike.
  done: card.stage === "done",
  closed: card.closed,
  labels: card.labels,
});

// The card's piece of work, with what it kept.
export function pieceOfCard(detail: CardDetail, course: Course): Work {
  return pieceOf(onBoard(detail), detail.kept, course);
}

const keptOf = (work: Work): Kept => ({
  stage: work.stage,
  passed: work.passed,
  history: work.history,
  parts: work.parts,
});

type Host = {
  cards: () => Cards;
  // The stages in the team's order, with their checks, as they are now.
  course: () => Course;
  // The stages of Kobble's own extensions: they hold no card but Build and
  // Done.
  kobbles: () => string[];
  changed: (what: string) => void;
  // Told when a piece moves, if anyone listens besides the page.
  heard?: (moved: Moved) => void;
  now?: () => string;
};

// The stages a card can be in, as the team has them now.
function courseOfCards(host: Host): Course {
  const stages = cardCourse(host.course(), host.kobbles());
  if (stages.length === 0)
    throw new Refused("Build has to come before Done in the order.");
  return stages;
}

// The card keeps its piece of work: its note, and the team's stage by label.
function keep(cards: Cards, number: number, work: Work): Promise<void> {
  if (!cards.keepWork)
    throw new Refused("This board cannot keep a card's piece of work.");
  return cards.keepWork(
    number,
    keptOf(work),
    isHeld(work.stage) ? work.stage : null,
  );
}

// Every open card as a piece of work, with the checks it still has to pass.
async function listed(host: Host) {
  const cards = host.cards();
  const stages = courseOfCards(host);
  const pieces = await Promise.all(
    (await cards.list())
      .filter((card) => !card.closed)
      .map(async (card) => {
        const piece = pieceOf(onBoard(card), null, stages);
        // Only a card in a team's stage has anything kept to read.
        const work = isHeld(piece.stage)
          ? pieceOfCard(await cards.show(card.number), stages)
          : piece;
        return { ...work, open: openChecks(work, stages) };
      }),
  );
  return { pieces };
}

async function checked(host: Host, number: number, check: string) {
  const cards = host.cards();
  const stages = courseOfCards(host);
  const piece = pieceOfCard(await cards.show(number), stages);
  await keep(cards, number, settled(passCheck(piece, stages, check)));
  host.changed("work");
}

async function moved(host: Host, number: number, to: string, by: string) {
  const cards = host.cards();
  const stages = courseOfCards(host);
  const detail = await cards.show(number);
  if (detail.closed)
    throw new Refused(`#${String(number)} is closed: open it again first.`);
  const before = pieceOfCard(detail, stages);
  const now = host.now?.() ?? new Date().toISOString();
  const after = settled(moveWork(before, to, stages, by, now));
  // Build and Done are the board's: the column follows the stage.
  if (after.stage === DONE_STAGE) await cards.move(number, "done");
  else if (before.stage === DONE_STAGE) await cards.move(number, "review");
  await keep(cards, number, after);
  host.heard?.({ work: after, from: before.stage, to: after.stage });
  host.changed("work");
}

export function workRoutes(host: Host): Record<string, Route> {
  const body = (given: unknown) => (given ?? {}) as Record<string, unknown>;
  return {
    "GET /api/work-pieces": () => listed(host),
    "POST /api/work-pieces/check": (given) => {
      const { number, check } = body(given);
      return checked(host, numberOf(number), text(check, "the check"));
    },
    "POST /api/work-pieces/move": (given) => {
      const { number, to, by } = body(given);
      return moved(host, numberOf(number), text(to, "the stage"), whoOf(by));
    },
  };
}

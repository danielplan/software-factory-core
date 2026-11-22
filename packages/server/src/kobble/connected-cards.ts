// The connected board's cards, for Kobble's buttons and Sprocket; refused
// with how to connect one when there is none.

import type { Cli } from "../extensions/github/github.ts";
import type { Cards } from "../cards/cards.ts";
import { cardsFor, NO_BOARD } from "../cards/cards-for.ts";
import { Refused } from "../refused.ts";

export function connectedCards(factory: string, cli: Cli): Cards {
  const found = cardsFor(factory, cli);
  if ("problem" in found)
    throw new Refused(
      [
        "No GitHub board is connected yet, so there is nowhere to put it.",
        ...(found.problem === NO_BOARD ? [] : [found.problem]),
        "Connect one in [Settings](#settings), under Where work is tracked.",
      ].join(" "),
    );
  return found.cards;
}

// A card's branch open in a copy that is not the factory's (a person works
// on it there): said once, and the card is left to them, in In progress.
// Then nothing is built.

import type { Cards } from "../cards/cards.ts";
import { branchOf } from "./branches.ts";
import type { BoardCard } from "./decide.ts";

export async function byHand(
  card: BoardCard,
  at: {
    build: () => Promise<{
      heldElsewhere: (branch: string) => Promise<string | null>;
    }>;
  },
  cards: Pick<Cards, "move">,
  say: (text: string) => Promise<void>,
): Promise<boolean> {
  const branch = branchOf(card.number);
  const where = await (await at.build()).heldElsewhere(branch);
  if (where === null) return false;
  await say(
    `The branch \`${branch}\` is open in \`${where}\`, which is not one of the factory's copies: someone works on this card by hand there, so the builder leaves it to them. To hand it back, switch that copy to another branch and move the card to **To do**.`,
  );
  if (card.stage === "todo") await cards.move(card.number, "doing");
  return true;
}

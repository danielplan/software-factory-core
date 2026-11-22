// The Factory's plug into Sprocket: a card looked at, and the team's agreed
// answer sent to the builder on a stuck one (card-look.ts). The Factory is
// always installed.

import { z } from "zod";

import type { SupportCards } from "./card-look.ts";
import { handOff, type SupportPlug } from "../../kobble/support-plug.ts";

const GUIDE = `**Factory** (\`#build\`): the board (Backlog, To do, In progress, Review, Done). The builder builds the cards in To do and opens a pull request once its checks pass; a card it gets stuck on waits at the top, under Stuck. Ask on a stuck card opens your conversation with "Card #27 is stuck …": call \`look_at_card\` first (the card, its conversation, what the builder did on its branch), then explain in plain words what is built, what is not and why it stopped; when it asks something, explain each choice and say which you would pick. Here you may use up to 120 words. Once they know what they want, say back the answer you will send, in their words, and \`answer_card\` once they agree: the builder carries on. A card that is not stuck is not sent from here.`;

export function factoryPlug(cards: SupportCards): SupportPlug {
  const number = z.number().int().positive().describe("The card's number.");
  return {
    extension: "factory",
    pages: ["build"],
    guide: GUIDE,
    handOffs: [
      handOff({
        name: "look_at_card",
        description:
          "A card on the Factory board: its text, column, conversation, and what the builder did on its branch (commits, changed files, run file). Read only.",
        input: { number },
        run: async ({ number: card }) => ({ said: await cards.look(card) }),
      }),
      handOff({
        name: "answer_card",
        description:
          "Sends the team's answer or hint to the builder on a stuck card and hands the card back to it (To do), as Send on the Factory page does. Only once the team agreed to the exact words you said back.",
        input: {
          number,
          text: z
            .string()
            .min(1)
            .describe(
              "The answer as the builder reads it on the card, in the team's words.",
            ),
        },
        run: async ({ number: card, text }) => ({
          said: await cards.answer(card, text),
          to: "#build",
        }),
      }),
    ],
  };
}

import assert from "node:assert/strict";
import { test } from "node:test";

import { partsOf, proposalsIn } from "../src/lib/persona-proposal.ts";

const GIULIA =
  "```persona\nname: Giulia\nplace: NOI Techpark, Bolzano\nabout: A founder who is not a developer.\nShe extends her own software.\n```";

test("a persona block becomes a card, with the words around it", () => {
  assert.deepEqual(
    partsOf(
      `Here's the persona I'd add. Is this right?\n\n${GIULIA}\n\nOr a different name?`,
    ),
    [
      { text: "Here's the persona I'd add. Is this right?" },
      {
        proposal: {
          name: "Giulia",
          place: "NOI Techpark, Bolzano",
          about:
            "A founder who is not a developer. She extends her own software.",
        },
      },
      { text: "Or a different name?" },
    ],
  );
});

test("several blocks are several cards, in order, with the words between them", () => {
  const text = `Here are all three.\n\n${GIULIA}\n\n\`\`\`persona\nname: Jonas\nplace: Web agency owner · Leipzig\nabout: Runs a team of three.\n\`\`\`\n\nand\n\n\`\`\`persona\nname: Marta\nplace: Physiotherapist · Verona\nabout: Runs her own small practice.\n\`\`\``;
  assert.deepEqual(
    proposalsIn(text).map((one) => one.name),
    ["Giulia", "Jonas", "Marta"],
  );
  assert.deepEqual(
    partsOf(text).map((part) =>
      "proposal" in part ? part.proposal.name : part.text,
    ),
    ["Here are all three.", "Giulia", "Jonas", "and", "Marta"],
  );
});

test("a block still being written shows only what came before it", () => {
  assert.deepEqual(partsOf("Here it is:\n\n```persona\nname: Giu"), [
    { text: "Here it is:" },
  ]);
  assert.deepEqual(
    partsOf(`Two:\n\n${GIULIA}\n\n\`\`\`persona\nname: Jo`).map((part) =>
      "proposal" in part ? part.proposal.name : part.text,
    ),
    ["Two:", "Giulia"],
  );
});

test("text without a block, or a block without a name, stays as it is", () => {
  assert.deepEqual(partsOf("Just words."), [{ text: "Just words." }]);
  const nameless = "x\n```persona\nplace: Milan\n```";
  assert.deepEqual(partsOf(nameless), [{ text: nameless }]);
});

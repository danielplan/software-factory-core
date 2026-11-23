import assert from "node:assert/strict";
import { test } from "node:test";

import { partsOf } from "../src/lib/persona-proposal.ts";

const BLOCK =
  "Here's the persona I'd add. Is this right?\n\n```persona\nname: Giulia\nplace: NOI Techpark, Bolzano\nabout: A founder who is not a developer.\nShe extends her own software.\n```\n\nOr a different name?";

test("a persona block becomes a card, with the words around it", () => {
  assert.deepEqual(partsOf(BLOCK), {
    before: "Here's the persona I'd add. Is this right?",
    proposal: {
      name: "Giulia",
      place: "NOI Techpark, Bolzano",
      about: "A founder who is not a developer. She extends her own software.",
    },
    after: "Or a different name?",
  });
});

test("a block still being written shows only the words before it", () => {
  assert.deepEqual(partsOf("Here it is:\n\n```persona\nname: Giu"), {
    before: "Here it is:",
    proposal: null,
    after: "",
  });
});

test("text without a block, or a block without a name, stays as it is", () => {
  assert.equal(partsOf("Just words.").proposal, null);
  const nameless = "x\n```persona\nplace: Milan\n```";
  assert.deepEqual(partsOf(nameless), {
    before: nameless,
    proposal: null,
    after: "",
  });
});

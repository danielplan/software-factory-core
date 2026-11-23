import assert from "node:assert/strict";
import { test } from "node:test";

import { partsOf } from "../src/lib/proposal-blocks.ts";

test("a persona block becomes a card, with the words around it", () => {
  const text =
    "Here's who I'd add.\n\n```persona\nname: Giulia\nplace: Startup founder · NOI Techpark, Bolzano\nabout: Not a developer.\nExtends her own software.\n```\n\nOr another name?";
  assert.deepEqual(partsOf(text), {
    before: "Here's who I'd add.",
    block: {
      kind: "persona",
      name: "Giulia",
      place: "Startup founder · NOI Techpark, Bolzano",
      about: "Not a developer. Extends her own software.",
    },
    after: "Or another name?",
  });
});

test("a mission block names the persona and what they try", () => {
  assert.deepEqual(
    partsOf("Shall I?\n```mission\npersona: bruno\ntask: Orders flour.\n```")
      .block,
    { kind: "mission", persona: "bruno", task: "Orders flour." },
  );
});

test("a block still being written shows only the words before it", () => {
  assert.deepEqual(partsOf("Here it is:\n\n```persona\nname: Giu"), {
    before: "Here it is:",
    block: null,
    after: "",
  });
});

test("text without a block, or a block missing what it needs, stays as it is", () => {
  assert.equal(partsOf("Just words.").block, null);
  const nameless = "x\n```persona\nplace: Milan\n```";
  assert.deepEqual(partsOf(nameless), {
    before: nameless,
    block: null,
    after: "",
  });
  assert.equal(partsOf("```mission\npersona: bruno\n```").block, null);
});

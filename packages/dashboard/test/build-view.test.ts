import assert from "node:assert/strict";
import { test } from "node:test";

import type { Answered, TicketView } from "../src/api.ts";
import {
  forOf,
  kindTone,
  outcomeOf,
  saidOf,
  seenNote,
  ticketLine,
} from "../src/build/view.ts";

// What Build says about the issues Kobble knows, from what the server
// sends.

const ticket = (more: Partial<TicketView> = {}): TicketView => ({
  issue: 131,
  kind: "idea",
  label: "Idea · B",
  idea: { id: "monday", title: "Monday order list", weThink: "Faster." },
  for: [
    { id: "copy", title: "Same order", persona: "bruno", story: "st4" },
    { id: "amounts", title: "Amounts", persona: "bruno", story: null },
  ],
  from: null,
  since: "2026-11-16",
  outcome: null,
  ...more,
});

test("a card says what it is for, linked to its story, or where a fix came from", () => {
  assert.deepEqual(forOf(ticket()), {
    lead: "For:",
    parts: [
      { title: "Same order", href: "#understand/bruno/st4" },
      { title: "Amounts", href: null },
    ],
  });
  assert.deepEqual(forOf(ticket({ for: [], from: "Errors" })), {
    lead: "From:",
    parts: [{ title: "Errors", href: null }],
  });
  assert.deepEqual(forOf(ticket({ for: [] })), {
    lead: "",
    parts: [{ title: "No problem behind it yet", href: null }],
  });
  assert.deepEqual(
    [kindTone("idea"), kindTone("fix"), kindTone("update")],
    ["solving", "open", "none"],
  );
});

test("the answer shows as a pill, and the dialog's lines say where the draft comes from", () => {
  const answer = (worked: "yes" | "no" | "unchecked") =>
    outcomeOf({ worked, by: "Pia", on: "2026-11-16" });
  assert.deepEqual(answer("yes"), { tone: "solved", words: "It worked" });
  assert.deepEqual(answer("no"), { tone: "wrong", words: "It didn't work" });
  assert.deepEqual(answer("unchecked"), {
    tone: "none",
    words: "Not checked",
  });
  assert.equal(
    ticketLine(ticket(), "Monday order list"),
    "“Monday order list”, in Build since 2026-11-16.",
  );
  assert.equal(ticketLine(ticket({ since: "" }), "X"), "“X”.");

  assert.match(seenNote(null), /looking/);
  assert.match(
    seenNote({ draft: "", heard: 2, problem: "Claude Code is not here." }),
    /couldn't look: Claude Code is not here\. Write what you noticed\./,
  );
  assert.match(
    seenNote({ draft: "", heard: 0, problem: null }),
    /Nobody has said anything/,
  );
  assert.match(
    seenNote({ draft: "Hi", heard: 1, problem: null }),
    /from 1 thing people said\./,
  );
  assert.match(
    seenNote({ draft: "Hi", heard: 3, problem: null }),
    /from 3 things people said/,
  );
});

test("after an answer, Build says what changed, in green when it worked", () => {
  const answered = (worked: "yes" | "no"): Answered => ({
    outcome: { issue: 1, worked, seen: null, by: "Pia", on: "2026-11-16" },
    said: worked === "yes" ? "Marked solved in Understand." : "Stays open.",
    problem: null,
  });
  assert.deepEqual(saidOf(answered("yes")), {
    text: "Marked solved in Understand.",
    good: true,
  });
  assert.equal(saidOf(answered("no")).good, false);
});

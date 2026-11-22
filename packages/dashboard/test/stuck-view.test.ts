import assert from "node:assert/strict";
import { test } from "node:test";

import type { WorkView } from "../src/api/client.ts";
import { reasonOf, type Stuck, stuckFor } from "../src/lib/stuck-view.ts";
import { waitingOf } from "../src/lib/home-view.ts";

const stuck = (over: Partial<Stuck>): Stuck => ({
  number: 214,
  title: "Pay by bank transfer",
  url: "https://github.com/acme/shop/issues/214",
  text: "",
  note: "blocked",
  ask: null,
  since: "2026-11-19T10:00:00Z",
  ...over,
});

test("a stuck card says why in one plain line", () => {
  assert.equal(
    reasonOf(stuck({ note: "checks-failed", text: "Long report" })),
    "The checks stayed red after three tries.",
  );
  assert.equal(
    reasonOf(stuck({ note: "failed", text: "The build stopped: x" })),
    "The builder could not finish it.",
  );
  assert.equal(
    reasonOf(stuck({ note: "out-of-sessions", text: "Step 3 is next." })),
    "It used its three sessions and is not finished yet. Continue gives it three more.",
  );
  assert.equal(
    reasonOf(
      stuck({
        text: "I need one decision.",
        ask: {
          about: "",
          where: "",
          question: "Which bank should it use?",
          answers: [],
          suggested: null,
        },
      }),
    ),
    "The builder asks: Which bank should it use?",
  );
  // Without the question's shape: its first paragraph, on one line.
  assert.equal(
    reasonOf(stuck({ text: "Which bank\nshould it use?\n\nMore words." })),
    "Which bank should it use?",
  );
  assert.equal(
    reasonOf(stuck({ text: "" })),
    "The builder stopped and asks you.",
  );
  assert.equal(reasonOf(stuck({ text: "x".repeat(400) })).length, 220);
});

test("how long a card has been stuck, in plain words", () => {
  const since = "2026-11-19T10:00:00Z";
  const at = (iso: string) => stuckFor(since, new Date(iso));
  assert.equal(at("2026-11-19T10:00:30Z"), "Stuck just now");
  assert.equal(at("2026-11-19T10:20:00Z"), "Stuck for 20 min");
  assert.equal(at("2026-11-19T12:00:00Z"), "Stuck for 2 h");
  assert.equal(at("2026-11-20T11:00:00Z"), "Stuck for 1 day");
  assert.equal(at("2026-11-23T10:00:00Z"), "Stuck for 4 days");
});

test("Home lists a stuck card among what waits, leading to the Factory page", () => {
  const work = {
    cards: [],
    problem: null,
    read: null,
    builder: { on: true } as WorkView["builder"],
    coach: { on: false } as WorkView["coach"],
    stuck: [stuck({ note: "checks-failed" })],
  } as WorkView;
  const [item] = waitingOf({ work, signals: [], fresh: 0, exploring: [] });
  assert.deepEqual(item, {
    id: "answer-214",
    kind: "Answer",
    title: "Pay by bank transfer",
    about: "The checks stayed red after three tries.",
    number: "#214",
    href: "#build",
    outside: false,
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bodyOf,
  draftOf,
  teamBits,
  titleOf,
} from "../src/features/support/draft.ts";
import type { Post } from "../src/api/feedback-board.ts";
import { findSimilarPosts } from "../src/features/support/similar.ts";
import {
  isBugWords,
  looksLikeFeedback,
} from "../src/features/support/words.ts";

const AT = "2026-11-20T10:00:00Z";
function post(number: number, title: string, thumbs = 1): Post {
  return {
    number,
    kind: "wish",
    title,
    body: "",
    thumbs,
    state: "sent",
    at: AT,
    url: `https://github.com/acme/feedback/issues/${String(number)}`,
    by: "someone",
  };
}

test("a clean title comes from the person's words, never with the team's data", () => {
  assert.equal(
    titleOf("I wish I could export the board.", "wish"),
    "Let me export the board",
  );
  assert.equal(
    titleOf(
      "Error: the builder stopped: git push to github.com/acme/shop refused (exit 128) for card “Refunds for Maria Rossi”",
      "bug",
    ),
    "The builder stopped: git push to the repository refused",
  );
  assert.ok(titleOf("x".repeat(200), "wish").length <= 80);
});

test("the draft carries version, page and errors, and what is taken out stays out", () => {
  const draft = draftOf({
    kind: "bug",
    said: "It stops halfway. Nothing tells me why.",
    answers: ["When it happened: when I pushed"],
    page: "Factory",
    errors: [{ id: 1, at: "10:42", text: "TypeError at board-card.tsx:88" }],
    fromError: false,
  });
  assert.deepEqual(
    draft.parts.map((one) => one.label),
    ["version", "page", "error"],
  );
  const sent = bodyOf({
    ...draft,
    parts: draft.parts.map((one) =>
      one.label === "error" ? { ...one, removed: true } : one,
    ),
  });
  assert.match(sent, /Nothing tells me why/);
  assert.match(sent, /\*\*page:\*\* Factory/);
  assert.doesNotMatch(sent, /TypeError/);
  assert.equal(bodyOf({ ...draft, parts: [] }), draft.body);
});

test("what looks like a team's data is marked", () => {
  const bits = teamBits(
    "Push to github.com/acme/shop refused for “Refunds for Maria Rossi”",
  );
  assert.deepEqual(
    bits.filter((one) => one.team).map((one) => one.text),
    ["github.com/acme/shop", "“Refunds for Maria Rossi”"],
  );
  assert.deepEqual(teamBits("nothing here"), [
    { text: "nothing here", team: false },
  ]);
});

test("a similar post shares two words with what is said, the closest first", () => {
  const posts = [
    post(1, "Let the builder work on two cards at once", 12),
    post(2, "Show signals from Slack"),
    post(3, "The builder works on cards one by one", 3),
  ];
  const found = findSimilarPosts(
    "I wish the builder could work on cards at the same time",
    "wish",
    posts,
  );
  assert.deepEqual(
    found.map((one) => one.number),
    [1, 3],
  );
  assert.deepEqual(findSimilarPosts("slack", "wish", posts), [posts[1]]);
  assert.deepEqual(findSimilarPosts("anything else", "wish", posts), []);
  assert.deepEqual(findSimilarPosts("builder cards", "bug", posts), []);
});

test("wishes and bugs are told apart in words", () => {
  assert.ok(looksLikeFeedback("I wish I could export"));
  assert.ok(looksLikeFeedback("it doesn't work"));
  assert.ok(!looksLikeFeedback("how do I add a persona"));
  assert.ok(isBugWords("it crashed, a bug"));
  assert.ok(!isBugWords("I wish for dark mode"));
});

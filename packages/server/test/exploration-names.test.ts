import assert from "node:assert/strict";
import { test } from "node:test";

import {
  askFor,
  commitWords,
} from "../src/kobble/explorations/making-words.ts";
import { freeKey, madeFor } from "../src/kobble/explorations/versions.ts";
import { plainWords } from "../src/kobble/explorations/views.ts";

// What things on an exploration's board are called: a preview's short
// words, and the names of prototypes.

test("the preview's words keep no Markdown marks", () => {
  assert.equal(
    plainWords(
      "## Sign-in\n- **Own** accounts, see [the page](https://x.test) and `start.ts`",
    ),
    "Sign-in Own accounts, see the page and start.ts",
  );
  assert.equal(plainWords("[not a link"), "[not a link");
});

test("a second choice's option A gets prototype A2, and each choice knows its own", () => {
  const prototype = (id: string, key: string) =>
    ({ id, kind: "prototype", key }) as never;
  const board = {
    things: [
      { id: "choice-1", kind: "choice" } as never,
      { id: "choice-2", kind: "choice" } as never,
      prototype("prototype-a", "A"),
    ],
    links: [{ id: "link-1", from: "choice-1", to: "prototype-a", label: "A" }],
  } as never;
  assert.equal(freeKey(board, "A"), "A2");
  assert.equal(freeKey(board, "B"), "B");
  assert.equal(madeFor(board, "choice-1", "A"), true);
  assert.equal(madeFor(board, "choice-2", "A"), false);
});

test("changing a prototype asks the maker for the change, and its commit says so", () => {
  const exploration = {
    id: "X-1",
    title: "Testers",
    problem: "Empty page",
  } as never;
  const made = {
    key: "A2",
    name: "One mission",
    difference: "Suggested",
    branch: "proto/X-1-a2",
  } as never;
  const board = { things: [], links: [] } as never;
  const asked = askFor(exploration, board, made, {
    change: "the empty page sends you to Personas",
    maps: "",
  });
  assert.match(
    asked,
    /^Make version A2 .*where it is already made\)\. The change: the empty page sends you to Personas\./,
  );
  assert.match(
    askFor(exploration, board, made, { change: undefined, maps: "" }),
    /^Make prototype A2/,
  );
  assert.equal(
    commitWords(
      "X-1",
      made,
      "the empty page sends you to Personas",
      "Done.\n\nMoved the button.",
    ),
    "Prototype A2 of X-1, changed: the empty page sends you to Personas\n\nMoved the button.",
  );
});

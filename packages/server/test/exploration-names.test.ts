import assert from "node:assert/strict";
import { test } from "node:test";

import { freeKey, madeFor } from "../src/kobble/explorations/prototypes.ts";
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

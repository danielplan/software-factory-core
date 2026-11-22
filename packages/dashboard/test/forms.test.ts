import assert from "node:assert/strict";
import { test } from "node:test";

import {
  answerSchema,
  connectSchema,
  FORM_PROBLEMS,
  markOf,
  newPersonaSchema,
  problemOf,
} from "../src/lib/forms.ts";

// The forms' schemas say why a field does not hold, with a word the page
// shows under it.

const why = (result: { success: boolean; error?: { issues: unknown[] } }) =>
  (result.error?.issues ?? []).map(
    (issue) =>
      (issue as { path: string[]; message: string }).path.join(".") +
      ": " +
      (issue as { message: string }).message,
  );

test("the live app's address is a web address, and the token is needed", () => {
  assert.equal(
    connectSchema.safeParse({
      url: " https://shop.example/api/kobble/export ",
      token: "t",
    }).data?.url,
    "https://shop.example/api/kobble/export",
  );
  assert.deepEqual(
    why(
      connectSchema.safeParse({ url: "file:///tmp/export.json", token: "t" }),
    ),
    ["url: address"],
  );
  assert.deepEqual(
    why(connectSchema.safeParse({ url: "not an address", token: "  " })),
    ["url: address", "token: needed"],
  );
  assert.deepEqual(
    why(connectSchema.safeParse({ url: "ftp://shop.example", token: "t" })),
    ["url: address"],
  );
  assert.deepEqual(why(connectSchema.safeParse({ url: "", token: "t" })), [
    "url: needed",
  ]);
});

test("a persona needs who they are, an answer needs words", () => {
  assert.ok(newPersonaSchema.safeParse({ title: "Mia", text: "" }).success);
  assert.deepEqual(
    why(newPersonaSchema.safeParse({ title: "   ", text: "x" })),
    ["title: needed"],
  );
  assert.deepEqual(why(answerSchema.safeParse({ answer: " " })), [
    "answer: needed",
  ]);
});

test("why a field does not hold shows once something was typed in it", () => {
  const address = { error: { message: "address" }, isDirty: true };
  assert.equal(problemOf(address), FORM_PROBLEMS.address);
  assert.equal(problemOf({ ...address, isDirty: false }), null);
  assert.equal(problemOf({ isDirty: true }), null);
  // A problem the list does not know is said as needed.
  assert.equal(
    problemOf({ error: { message: "odd" }, isDirty: true }),
    FORM_PROBLEMS.needed,
  );
  assert.deepEqual(markOf(address, "url-problem"), {
    "aria-invalid": true,
    "aria-describedby": "url-problem",
  });
  assert.deepEqual(markOf({ isDirty: true }, "url-problem"), {
    "aria-invalid": false,
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { SAID } from "../../server/src/chat/fitted.ts";
import { refusalWords } from "../src/chat/refusals.ts";
import { resources } from "../src/i18n/i18n.ts";

// Why the factory refused something, in the person's language: every plain
// sentence the server can say in the chat and the check-up has its words
// here, the same in English.

test("every sentence the server refuses with is in the chat's words, as it says it", () => {
  const english: Record<string, string> = resources.en.chat.refused;
  for (const [key, sentence] of Object.entries(SAID))
    assert.equal(english[key], sentence, key);
});

test("a refusal is said in the dashboard's words; one not known is shown as it came", () => {
  assert.equal(refusalWords(SAID.mismatch), resources.en.chat.refused.mismatch);
  assert.equal(
    refusalWords("Someone has acted on that finding already."),
    resources.en.checks.refused.acted,
  );
  assert.equal(
    refusalWords("The file “notes.txt” is not there any more."),
    "The file “notes.txt” is not there any more.",
  );
  assert.equal(refusalWords("Something else."), "Something else.");
});

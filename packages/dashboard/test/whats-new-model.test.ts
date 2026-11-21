import assert from "node:assert/strict";
import { test } from "node:test";

import { compareVersions } from "../../core/src/version.ts";

import { messagesIn } from "../src/i18n/messages.ts";
import {
  ago,
  firstSentence,
  shownChange,
  showsNewer,
} from "../src/updates/whats-new-model.ts";

test("a text splits into its first sentence and the rest", () => {
  assert.deepEqual(firstSentence("One. Two. Three."), {
    first: "One.",
    rest: "Two. Three.",
  });
  assert.deepEqual(firstSentence("Only one."), {
    first: "Only one.",
    rest: "",
  });
  assert.deepEqual(firstSentence(""), { first: "", rest: "" });
  // A stop inside a link or a number does not end it.
  assert.deepEqual(
    firstSentence("See [the page](https://a.b/c.d) for 0.13.2 now. More."),
    { first: "See [the page](https://a.b/c.d) for 0.13.2 now.", rest: "More." },
  );
  assert.equal(
    shownChange({ kind: "New", title: "T.", text: "A. B." }).rest,
    "B.",
  );
});

test("the newer release shows only when it is newer than the running one", () => {
  assert.equal(
    showsNewer({ version: "0.14.0" }, "0.13.2", compareVersions),
    true,
  );
  assert.equal(
    showsNewer({ version: "0.13.2" }, "0.13.2", compareVersions),
    false,
  );
  assert.equal(showsNewer(null, "0.13.2", compareVersions), false);
});

test("a time is said as a distance from now, in the language", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");
  assert.equal(ago("en", "2026-11-21T11:55:00Z", now), "5 minutes ago");
  assert.equal(ago("en", "2026-11-21T09:00:00Z", now), "3 hours ago");
  assert.equal(ago("en", "2026-11-21T11:59:50Z", now), "now");
  assert.match(ago("it", "2026-11-21T11:55:00Z", now), /5 minuti fa/);
  assert.match(ago("de", "2026-11-19T12:00:00Z", now), /vorgestern|2 Tagen/);
});

test("the words are the same keys in every language, and say nothing to do", () => {
  const keys = (locale: "en" | "it" | "de") =>
    Object.keys(messagesIn(locale).whatsNew).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(keys("it"), keys("en"));
  assert.deepEqual(keys("de"), keys("en"));
  assert.equal(
    messagesIn("de").whatsNew.youAre("0.13.2"),
    "Du bist auf Kobble 0.13.2",
  );
});

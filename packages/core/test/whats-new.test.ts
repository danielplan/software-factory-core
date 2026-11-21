import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hasWhatsNewFor,
  parseWhatsNew,
  whatsNewFile,
  whatsNewIn,
} from "../src/whats-new.ts";

const EN = `# What's new

## 0.13.2 (2026-11-21)

- New: **Send feedback.** Say it in one window, with a [link](https://x.y) and \`code\`.
- Fixed: **A blank page.** It loads again.
- Something else that is not a change.

## 0.13.1

- Changed: **Quieter** 
Not a change line either.
`;

test("a file becomes releases with their changes", () => {
  const [one, two] = parseWhatsNew(EN);
  assert.equal(one?.version, "0.13.2");
  assert.equal(one?.date, "2026-11-21");
  assert.deepEqual(one?.changes[0], {
    kind: "New",
    title: "Send feedback.",
    text: "Say it in one window, with a [link](https://x.y) and `code`.",
  });
  assert.equal(one?.changes[1]?.kind, "Fixed");
  assert.equal(one?.changes.length, 2);
  assert.deepEqual(two, {
    version: "0.13.1",
    date: null,
    changes: [{ kind: "Changed", title: "Quieter", text: "" }],
  });
});

test("an empty file, or lines before any heading, give nothing", () => {
  assert.deepEqual(parseWhatsNew(""), []);
  assert.deepEqual(parseWhatsNew("- New: **Lost.** No release yet."), []);
  assert.deepEqual(parseWhatsNew("## 1.0.0\n\nOnly words."), []);
});

test("a release is found by its version", () => {
  assert.equal(hasWhatsNewFor(EN, "0.13.2"), true);
  assert.equal(hasWhatsNewFor(EN, "0.14.0"), false);
});

test("files are named by language", () => {
  assert.equal(whatsNewFile("en"), "WHATS-NEW.md");
  assert.equal(whatsNewFile("it"), "WHATS-NEW.it.md");
});

test("a language falls back to English per release, newest first", () => {
  const it = "## 0.13.2\n\n- New: **Feedback IT.** Testo.\n";
  const releases = whatsNewIn({ en: EN, it }, "it");
  assert.deepEqual(
    releases.map((one) => one.version),
    ["0.13.2", "0.13.1"],
  );
  assert.equal(releases[0]?.changes[0]?.title, "Feedback IT.");
  assert.equal(releases[1]?.changes[0]?.title, "Quieter");
  assert.deepEqual(whatsNewIn({}, "de"), []);
});

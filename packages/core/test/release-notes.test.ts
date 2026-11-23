import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  bodySections,
  changesOf,
  joinReleases,
  type KeptRelease,
  notesIn,
  notesOfBody,
  RELEASE_NOTES_FILE,
  releaseBody,
  releaseNotesFileSchema,
  type ReleaseNotes,
  versionOfTag,
} from "../src/release-notes.ts";

const NOTES: ReleaseNotes = {
  en: [
    {
      kind: "New",
      title: "Send feedback.",
      text: "Say it in one window, with a [link](https://x.y) and `code`.",
    },
    { kind: "Fixed", title: "Quieter", text: "" },
  ],
  it: [{ kind: "New", title: "Invia un commento.", text: "In una finestra." }],
  de: [
    { kind: "New", title: "Rückmeldung senden.", text: "In einem Fenster." },
  ],
};

test("a release's text is English first, then a folding section per language", () => {
  const body = releaseBody(NOTES, "Pull requests: [#5](https://x.y/5)");
  assert.equal(
    body,
    [
      "- New: **Send feedback.** Say it in one window, with a [link](https://x.y) and `code`.",
      "- Fixed: **Quieter**",
      "",
      "Pull requests: [#5](https://x.y/5)",
      "",
      '<details lang="it">',
      "<summary>Italiano</summary>",
      "",
      "- New: **Invia un commento.** In una finestra.",
      "",
      "</details>",
      "",
      '<details lang="de">',
      "<summary>Deutsch</summary>",
      "",
      "- New: **Rückmeldung senden.** In einem Fenster.",
      "",
      "</details>",
      "",
    ].join("\n"),
  );
});

test("the notes read back from the text are the notes written", () => {
  assert.deepEqual(notesOfBody(releaseBody(NOTES, "More words.")), NOTES);
  assert.deepEqual(notesOfBody(releaseBody({ en: NOTES.en })), {
    en: NOTES.en,
  });
  // A comment before the notes, as the Releases page keeps its reason.
  assert.deepEqual(
    notesOfBody(`<!-- a comment -->\n${releaseBody(NOTES)}`),
    NOTES,
  );
});

test("the sections of a text: a text written another way is all English", () => {
  assert.deepEqual(bodySections("## Fixes\n\n- A thing (#3)\n"), {
    en: "## Fixes\n\n- A thing (#3)",
  });
  const sections = bodySections(releaseBody(NOTES, "After."));
  assert.match(sections.en ?? "", /After\.$/);
  assert.equal(sections.it, "- New: **Invia un commento.** In una finestra.");
  // A section in a language Kobble does not speak is left out.
  assert.deepEqual(
    Object.keys(
      bodySections(
        '<details lang="fr">\n<summary>F</summary>\n\nx\n</details>',
      ),
    ),
    ["en"],
  );
});

test("only change lines count", () => {
  assert.deepEqual(
    changesOf(
      "- New: **One.** Text.\n- Something else.\n- Changed: **Broken\n* Fixed: **Two.**",
    ),
    [
      { kind: "New", title: "One.", text: "Text." },
      { kind: "Fixed", title: "Two.", text: "" },
    ],
  );
});

test("the notes in a language, else in English", () => {
  assert.equal(notesIn(NOTES, "it")[0]?.title, "Invia un commento.");
  assert.equal(
    notesIn({ en: NOTES.en, it: [] }, "it")[0]?.title,
    "Send feedback.",
  );
  assert.equal(notesIn(NOTES, "fr")[0]?.title, "Send feedback.");
});

test("a tag gives its version only when it is vX.Y.Z", () => {
  assert.equal(versionOfTag("v0.15.0"), "0.15.0");
  assert.equal(versionOfTag("release-0.15.0"), null);
  assert.equal(versionOfTag("v1"), null);
});

test("two lists of releases join, newest first, the second winning", () => {
  const kept = (version: string, title: string): KeptRelease => ({
    version,
    date: null,
    notes: { en: [{ kind: "New", title, text: "" }] },
  });
  const joined = joinReleases(
    [kept("0.9.0", "old"), kept("0.10.0", "offline")],
    [kept("0.10.0", "online"), kept("0.11.0", "new")],
  );
  assert.deepEqual(
    joined.map((one) => [one.version, one.notes.en[0]?.title]),
    [
      ["0.11.0", "new"],
      ["0.10.0", "online"],
      ["0.9.0", "old"],
    ],
  );
});

test("the repository's offline copy reads, with every language for every release", () => {
  const file = resolve(import.meta.dirname, "../../..", RELEASE_NOTES_FILE);
  const { releases } = releaseNotesFileSchema.parse(
    JSON.parse(readFileSync(file, "utf8")),
  );
  assert.ok(releases.length > 0);
  for (const release of releases) {
    assert.ok(release.notes.en.length > 0, release.version);
    assert.equal(release.notes.it?.length, release.notes.en.length);
    assert.equal(release.notes.de?.length, release.notes.en.length);
  }
});

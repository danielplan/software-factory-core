import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  keptNotes,
  notesProblems,
  packageNotes,
  publishedNotes,
} from "../../../scripts/kobble-notes.mjs";
import { releaseBody } from "../src/release-notes.ts";

const root = resolve(import.meta.dirname, "../../..");

const listed = (tag: string, body: string, draft = false) => ({
  tag_name: tag,
  body,
  published_at: draft ? null : "2026-12-01T09:00:00Z",
  draft,
});

const change = (title: string) => ({ kind: "New" as const, title, text: "" });

test("the package carries the offline copy with GitHub's published notes", () => {
  const kept = keptNotes(root);
  const published = publishedNotes([
    listed(
      "v0.20.0",
      releaseBody({
        en: [change("Twenty.")],
        it: [change("Venti.")],
        de: [change("Zwanzig.")],
      }),
    ),
    listed("v0.21.0", "draft", true),
    listed("release-0.20.0", "x"),
  ]);
  assert.deepEqual(
    published.map((one) => [one.version, one.date]),
    [["0.20.0", "2026-12-01"]],
  );
  const { releases } = packageNotes(kept, published);
  assert.equal(releases[0]?.version, "0.20.0");
  assert.equal(releases.length, kept.length + 1);
  assert.deepEqual(notesProblems(releases, "0.20.0"), []);
});

test("a release needs its notes on GitHub, in every language", () => {
  assert.match(notesProblems([], "0.20.0").join(), /Releases page first/);
  const english = publishedNotes([
    listed("v0.20.0", releaseBody({ en: [change("Twenty.")] })),
  ]);
  assert.deepEqual(
    notesProblems(english, "0.20.0").map((one) => one.slice(0, 40)),
    [
      "The notes of v0.20.0 on GitHub lack the ",
      "The notes of v0.20.0 on GitHub lack the ",
    ],
  );
});

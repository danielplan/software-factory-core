import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { releaseBody } from "@software-factory/core";

import type { CodeReleases, HostRelease } from "../src/code-host.ts";
import { hostNotes, offlineNotes } from "../src/updates/kobble-notes.ts";

const folder = mkdtempSync(join(tmpdir(), "kobble-notes-"));
after(() => {
  rmSync(folder, { recursive: true, force: true });
});

const KEPT = {
  version: "0.11.1",
  date: "2026-11-01",
  notes: { en: [{ kind: "New", title: "Here.", text: "Now." }] },
};

test("the offline copy is found by walking up from the server's folder", () => {
  const deep = join(folder, "node_modules", "@x", "server", "src");
  mkdirSync(deep, { recursive: true });
  writeFileSync(
    join(folder, "release-notes.json"),
    JSON.stringify({ releases: [KEPT] }),
  );
  assert.deepEqual(offlineNotes(deep), [KEPT]);
});

test("no offline copy gives no releases; one that does not read is refused", () => {
  const empty = mkdtempSync(join(tmpdir(), "kobble-notes-none-"));
  try {
    assert.deepEqual(offlineNotes(empty), []);
    writeFileSync(join(empty, "release-notes.json"), '{"releases": [{}]}');
    assert.throws(() => offlineNotes(empty));
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

function host(listed: HostRelease[] | "fails"): CodeReleases {
  return {
    tags: () => Promise.resolve([]),
    list: () =>
      listed === "fails"
        ? Promise.reject(new Error("offline"))
        : Promise.resolve(listed),
    mergedSince: () => Promise.resolve([]),
    create: () => Promise.resolve(),
  };
}

test("the code host's published vX.Y.Z releases give their notes", async () => {
  const body = releaseBody({
    en: [{ kind: "Fixed", title: "Gone.", text: "" }],
    it: [{ kind: "Fixed", title: "Sparito.", text: "" }],
  });
  const release = (tag: string, draft = false): HostRelease => ({
    tag,
    date: draft ? "" : "2026-11-22T10:00:00Z",
    url: "u",
    body,
    draft,
  });
  assert.deepEqual(
    await hostNotes(
      host([release("v0.12.0"), release("v0.13.0", true), release("x")]),
    ),
    [
      {
        version: "0.12.0",
        date: "2026-11-22",
        notes: {
          en: [{ kind: "Fixed", title: "Gone.", text: "" }],
          it: [{ kind: "Fixed", title: "Sparito.", text: "" }],
        },
      },
    ],
  );
  assert.equal(await hostNotes(host("fails")), null);
  assert.equal(await hostNotes(null), null);
});

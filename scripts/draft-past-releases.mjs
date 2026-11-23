// A one-off: Kobble's past release notes (those written before the notes
// lived on GitHub, now in the offline copy, release-notes.json) as draft
// GitHub releases, one per version whose tag v<version> is there and which
// has no release yet. Drafts, so the maintainer reads each one and
// publishes it on GitHub.
//
//   node scripts/draft-past-releases.mjs            says what it would make
//   node scripts/draft-past-releases.mjs --create   makes the drafts
//
// A version without its tag (not released yet) is left out: its release is
// made on Kobble's Releases page.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { releaseBody } from "../packages/core/src/release-notes.ts";
import {
  githubReleases,
  KOBBLE_REPOSITORY,
  keptNotes,
} from "./kobble-notes.mjs";

const here = resolve(import.meta.dirname, "..");
const create = process.argv.includes("--create");
const gh = (args) => execFileSync("gh", args, { encoding: "utf8" });

const tags = new Set(
  gh([
    "api",
    `repos/${KOBBLE_REPOSITORY}/git/matching-refs/tags/v`,
    "--paginate",
    "--jq",
    ".[].ref",
  ])
    .split("\n")
    .map((ref) => ref.trim().replace(/^refs\/tags\//, ""))
    .filter(Boolean),
);
const released = new Set(githubReleases().map((one) => one.tag_name));

for (const release of keptNotes(here)) {
  const tag = `v${release.version}`;
  if (released.has(tag)) {
    process.stdout.write(`${tag}: has a release already, left alone.\n`);
    continue;
  }
  if (!tags.has(tag)) {
    process.stdout.write(
      `${tag}: no such tag yet, left out (make it on the Releases page).\n`,
    );
    continue;
  }
  if (!create) {
    process.stdout.write(
      `${tag}: would be made as a draft (run again with --create).\n`,
    );
    continue;
  }
  gh([
    "release",
    "create",
    tag,
    "--repo",
    KOBBLE_REPOSITORY,
    "--draft",
    "--verify-tag",
    "--title",
    release.version,
    "--notes",
    releaseBody(release.notes),
  ]);
  process.stdout.write(`${tag}: made as a draft.\n`);
}

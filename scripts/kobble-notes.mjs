// Kobble's release notes for its package, shared by the build and the
// publish step: the offline copy kept at the repository's root
// (release-notes.json; its first releases came from the old what's-new
// files) joined with Kobble's published GitHub releases, read with the
// GitHub CLI of the person releasing. The package carries the result, so
// Settings › Updates shows the notes without the network.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  joinReleases,
  notesOfBody,
  RELEASE_NOTES_FILE,
  releaseNotesFileSchema,
  versionOfTag,
} from "../packages/core/src/release-notes.ts";
import { RELEASE_SOURCE } from "../packages/core/src/version.ts";

export const KOBBLE_REPOSITORY = RELEASE_SOURCE.replace(/^github:/, "");

// The releases of the offline copy at the root.
export function keptNotes(root) {
  return releaseNotesFileSchema.parse(
    JSON.parse(readFileSync(join(root, RELEASE_NOTES_FILE), "utf8")),
  ).releases;
}

// Kobble's releases on GitHub, as its API lists them (drafts too).
export function githubReleases(repository = KOBBLE_REPOSITORY) {
  const out = execFileSync(
    "gh",
    ["api", `repos/${repository}/releases?per_page=100`, "--paginate"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  // --paginate puts one JSON list after another.
  return JSON.parse(`[${out.trim().replaceAll(/\]\s*\[/g, "],[")}]`).flat();
}

// The published vX.Y.Z releases among them, with their notes.
export function publishedNotes(listed) {
  return listed.flatMap((release) => {
    const version = versionOfTag(release.tag_name);
    return version && !release.draft
      ? [
          {
            version,
            date: (release.published_at ?? "").slice(0, 10) || null,
            notes: notesOfBody(release.body ?? ""),
          },
        ]
      : [];
  });
}

// What the package carries: the offline copy, GitHub's notes in place of
// the same version.
export function packageNotes(kept, published) {
  return { releases: joinReleases(kept, published) };
}

// What stops a release: no notes for the version, or notes not in every
// language. Empty when it is ready.
export function notesProblems(releases, version) {
  const found = releases.find((release) => release.version === version);
  if (!found || found.notes.en.length === 0)
    return [
      `Kobble ${version} has no release with notes on GitHub. Make it on Kobble's Releases page first (tag v${version}).`,
    ];
  return ["it", "de"].flatMap((language) =>
    (found.notes[language] ?? []).length === found.notes.en.length
      ? []
      : [
          `The notes of v${version} on GitHub lack the ${language} section, or it has another number of changes than the English. Edit the release on GitHub (see docs/how-to/make-a-release.md).`,
        ],
  );
}

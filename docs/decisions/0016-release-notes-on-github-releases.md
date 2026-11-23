---
status: accepted
date: 2026-11-23
decision-makers: the maintainer
---

# Release notes live on GitHub releases

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

What each Kobble version brought for the team was written by hand in three
files at the repository's root (`WHATS-NEW.md` and its Italian and German
copies), parsed by the core and shown in Settings › Updates. The files were
odd: a second place for release notes beside the Releases page, which
already writes a product's notes from the pull requests merged, written
three times by hand, and read from GitHub at a tag for a newer version.
Where should Kobble's release notes live?

## Considered Options

- Keep the three files at the root, written by hand at each release.
- Keep the notes on the GitHub release of each version: drafted on the
  Releases page from the pull requests merged, in English, with the Italian
  and German made in the same step and folded into the same text.

## Decision Outcome

Chosen: GitHub releases. Kobble's own repository is released on Kobble's
Releases page like any product. Prepare asks the kobold for the number and,
in the same answer, the notes in English with the same notes in Italian
and German; Release puts them into one text, English first and each other
language in a `<details lang="…">` section, in a shape the core reads back
(`packages/core/src/release-notes.ts`). Settings › Updates reads the notes
from the GitHub releases in the person's language, else in English. The
package carries a copy of the notes (`release-notes.json`, made by
`npm run release`), so a factory without the network or without GitHub
still shows them. GitHub is reached only through the code host of the
`code` slot, which now makes and lists releases; Releases no longer runs
the GitHub CLI itself.

### Consequences

- Good, because the notes are in one place, next to the tag, and written
  once: the kobold drafts them from the pull requests merged.
- Good, because every product a factory releases gets notes in the three
  languages Kobble speaks.
- Bad, because a translation is the kobold's, not a person's; a wrong word
  is fixed by editing the release on GitHub, keeping its shape.
- Bad, because the notes of a release whose package is not built yet show
  only through GitHub, and a factory whose code host is not GitHub sees
  only the copy its Kobble carries.

## More Information

[Make a release](../how-to/make-a-release.md),
[Releases](../reference/features/releases.md),
[Settings and updates](../reference/features/settings-and-updates.md#updates).
The past notes are in `release-notes.json`;
`scripts/draft-past-releases.mjs` makes them draft GitHub releases.

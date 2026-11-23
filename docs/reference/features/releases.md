# Releases

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how does the Releases page turn what was merged into a numbered release with notes?

## What it does

The Releases page (`#releases`) turns everything merged since the last
release into a numbered release of the product, in one click. A release is
GitHub's own: a tag `v<x.y.z>` on the main branch's latest commit and a
GitHub release on it with the notes. Nothing is stored in the factory's
files; past releases are read back from GitHub. It is one release for the
whole repository, and needs a connected repository whose account may create
tags and releases.

- **The last release** is the highest `vX.Y.Z` tag; tags of other shapes are
  ignored. A pull request is merged since then when its merge commit is
  among the commits since that tag.
- **Prepare the release** asks a kobold to judge what was merged: whether
  people have to do something, or something they relied on changes or goes
  away, with a reason line, and to draft the notes in the same answer.
  Reading the page uses no AI; **Release now** uses the answer Prepare gave
  (asked again then only when the factory started again since).
- **The number** follows [the rule the core uses for itself](../versions.md#which-number-to-raise):
  the last number goes up; the middle one only when people have to do
  something or something they relied on changes or goes away; the first one
  never by itself. Without the kobold's answer, the next patch is suggested.
  The first release is `0.1.0`. The team can change the number; it must be
  `x.y.z`, higher than the last, and not a tag that exists.
- **The notes** are drafted by the kobold for the people who use the
  product: one line per change they notice, `New`, `Changed` or `Fixed`, a
  short title and one or two sentences, in English, with the same notes in
  Italian and German. The page shows them, in its language, once prepared.
  The release's text has the English first, then the pull requests merged,
  each linked, then a folding `<details lang="…">` section per other
  language ([the shape](../../how-to/make-a-release.md#the-shape-of-the-notes),
  `packages/core/src/release-notes.ts`). Without the kobold's draft, each
  pull request is a change of its card's type (bug: Fixed, feature: New,
  otherwise Changed), in English only.
- **Past releases** show their notes in the page's language, else in
  English. Kobble's own release notes are made here too
  ([decision 0016](../../decisions/0016-release-notes-on-github-releases.md)).
- With nothing merged since the last release, **Release now** is greyed out
  and the server refuses too.

## Rules that must hold

- Work reaches main only through a pull request, so the notes list it
  ([decision 0006](../../decisions/0006-work-reaches-main-through-a-pull-request.md)).
- Both POSTs are answered only from the factory's page.

## Where it lives

| Part          | Where                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| The extension | `packages/server/src/extensions/releases/`: `numbers.ts`, `judge.ts`, `notes.ts`, `product-releases.ts`, `routes.ts`       |
| The code host | `CodeHost.releases` in `packages/server/src/code-host.ts`; GitHub's in `packages/server/src/extensions/github/releases.ts` |
| The notes     | `packages/core/src/release-notes.ts`                                                                                       |
| The page      | `packages/dashboard/src/extensions/releases/`                                                                              |

The routes: `GET /api/releases`, `POST /api/releases/prepare`,
`POST /api/releases`.

## Checked and not checked

Checked by tests: the numbers, the notes and their shape
(`release-numbers.test.ts`, `releases.test.ts`, `release-notes.test.ts`).
Not checked: the kobold's judgement and its notes and translations on real
merged work, and a real release on a team's repository. Releases reaches
GitHub only through the code host of the `code` slot.

# Make a release of the core

[Knowledge base](../index.md) · [How-to guides](index.md)

**Type:** How-to · Answers: how is a version of the core made and published, so the companies' projects can take it?

A project installs the core straight from this repository, at the tag of a
release, and `software-factory upgrade` brings its factory to that version.

1. **Migrations.** Every change a company would have to make by hand has its
   migration in `packages/server/src/upgrade/migrations.ts`, for this
   version. What it cannot decide alone it leaves to the owner, in a line.
2. **The number.** Raise `CORE_VERSION` in `packages/core/src/version.ts`,
   by the rule in [versions](../reference/versions.md#which-number-to-raise).
3. **What's new.** Write what the release changes for the team, in plain
   words, in `WHATS-NEW.md`, `WHATS-NEW.it.md` and `WHATS-NEW.de.md` at the
   root: a `## <version>` section (`## 0.13.2 (2026-11-21)` also works), and
   one line per change, `- New: **Title.** One or two sentences.` (`New`,
   `Changed` or `Fixed`; Markdown is fine inside). No instructions:
   upgrading is automatic. `npm run release` refuses to publish while a
   language has no section for the version.
4. **A pull request.** `npm run verify`, commit on a branch and open a pull
   request; work reaches main only through one. Once it is merged, tag its
   merge commit on main `v<version>`.
5. **Publish.** `npm run release -- --push` builds the core as one package
   (compiled to JavaScript, its own packages bundled in it, the page built,
   the three what's-new files beside the README), commits it to the
   `release` branch and tags it `release-<version>`, then pushes the branch
   and the tag. Without `--push` it stops before pushing.

The build is `scripts/build-release.mjs`, the publishing
`scripts/publish-release.mjs`; the release branch's working copy is
`.release/`, made the first time.

## Check

- The tag `release-<version>` is on the `release` branch on GitHub.
- In the example company, or any project, pinning that tag, `npm install`
  and `npx software-factory upgrade` finish without problems.

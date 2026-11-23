# Make a release of the core

[Knowledge base](../index.md) · [How-to guides](index.md)

**Type:** How-to · Answers: how is a version of the core made and published, with its notes, so the companies' projects can take it?

A project installs the core straight from this repository, at the tag of a
release, and `software-factory upgrade` brings its factory to that version.
What a release brings for the team lives in the notes of its GitHub release
([decision 0016](../decisions/0016-release-notes-on-github-releases.md)),
made on Kobble's own Releases page: this repository is a product its own
factory releases like any other.

1. **Migrations.** Every change a company would have to make by hand has its
   migration in `packages/server/src/upgrade/migrations.ts`, for this
   version. What it cannot decide alone it leaves to the owner, in a line.
2. **The number.** Raise `CORE_VERSION` in `packages/core/src/version.ts`,
   by the rule in [versions](../reference/versions.md#which-number-to-raise).
3. **A pull request.** `npm run verify`, commit on a branch and open a pull
   request; work reaches main only through one. Merge it.
4. **The release and its notes.** In Kobble, on this repository's factory,
   open the Releases page and press **Prepare the release**: the kobold
   reads the pull requests merged since the last release, suggests the
   number and drafts the notes, in English, with the same notes in Italian
   and German. Check the number is `CORE_VERSION` (change it if not) and
   press **Release**. This makes the tag `v<version>` on main and the GitHub
   release with the notes. To change a word afterwards, edit the release on
   GitHub, keeping its shape (below).
5. **Publish.** `npm run release -- --push` checks that the GitHub release
   `v<version>` has its notes in English, Italian and German, builds the
   core as one package (compiled to JavaScript, its own packages bundled in
   it, the page built, and `release-notes.json` beside the README: the
   offline copy at the root joined with the GitHub releases' notes), commits
   it to the `release` branch and tags it `release-<version>`, then pushes
   the branch and the tag. Without `--push` it stops before pushing.

The build is `scripts/build-release.mjs`, the publishing
`scripts/publish-release.mjs`, the notes for the package
`scripts/kobble-notes.mjs`; the release branch's working copy is
`.release/`, made the first time. Both read GitHub with the GitHub CLI of
the person releasing.

## The shape of the notes

The release's text is read back by Settings › Updates, so it keeps one
shape (`packages/core/src/release-notes.ts`): one line per change,
`- New: **Title.** One or two sentences.` (`New`, `Changed` or `Fixed`, in
English in every language; Markdown is fine inside), English first, then
each other language in a section of its own:

```markdown
- New: **Title.** Text.

Pull requests: [#36](…), [#37](…)

<details lang="it">
<summary>Italiano</summary>

- New: **Titolo.** Testo.

</details>

<details lang="de">
<summary>Deutsch</summary>

- New: **Titel.** Text.

</details>
```

No instructions: upgrading is automatic. Lines that are not changes are
left out of the page.

## The past releases

The notes of the releases before 0.15.0 were written in files at the root.
They are in the offline copy, `release-notes.json`, and
`node scripts/draft-past-releases.mjs` says which of them it would make as
**draft** GitHub releases (one per version whose tag `v<version>` is there
and has no release yet); `--create` makes them. Read each draft on GitHub
and publish it.

## Check

- The GitHub release `v<version>` shows the notes, with Italiano and Deutsch
  folding open.
- The tag `release-<version>` is on the `release` branch on GitHub.
- In the example company, or any project, pinning that tag, `npm install`
  and `npx software-factory upgrade` finish without problems, and Settings ›
  Updates shows the notes in each language.

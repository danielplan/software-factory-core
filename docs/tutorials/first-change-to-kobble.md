# Your first change to Kobble

[Knowledge base](../index.md) · [Tutorials](index.md)

**Type:** Tutorial · Answers: what does one whole change to Kobble look like, from a fresh branch to a pull request?

For a new AI agent or developer. You make one small change the way every
change is made here: you change the line under the Releases page's title, in
English, Italian and German, and bring the docs in line. Do it once on a
scratch branch to learn where things are; you do not need to keep it.

## 1. Set up

At the repository root:

```sh
npm install
git switch -c try/first-change
```

`npm install` also sets up the git hooks (lefthook). Read
[AGENTS.md](../../AGENTS.md) and [the repository's rules](../reference/conventions/repository.md).
To see Kobble run on its own factory:
`node packages/server/bin/software-factory.ts . --port 4330`, then open
<http://localhost:4330>.

## 2. Find where the change goes

1. The [features index](../reference/features/index.md) says Releases is
   brought by the Releases extension, at `#releases`. Its
   [page](../reference/features/releases.md) names the folders: the server's
   `packages/server/src/extensions/releases/` and the page's
   `packages/dashboard/src/features/releases/`.
2. The line under a page's title is a word on a screen, so it lives in the
   page's catalogue. `packages/dashboard/src/features/releases/releases-page.tsx`
   draws it with `PageHead` and `t.releases.about`; the words are in
   `packages/dashboard/src/i18n/areas/releases.ts`.
3. Read [the page's conventions](../reference/conventions/page.md) and
   [languages](../reference/languages.md): every word in English, Italian
   and German, through `useT()`.

## 3. Make the change and check it

1. Change the English line, then the Italian and German ones. The type
   check refuses a language that lacks the key.
2. Run the page's tests on words:

   ```sh
   node --experimental-strip-types --test-isolation=none --test packages/dashboard/test/i18n.test.ts packages/dashboard/test/words-in-catalogue.test.ts
   ```

3. Run the import rules: `npm run check:borders:dashboard`. Had you imported
   something from another feature, it would fail here.

Commit, with a message in plain words that says what changed and why.

## 4. Bring the docs in line

Does a page of this knowledge base say what the Releases page's head says?
If so, change it in the same branch. If none needs to change, say so in a
commit line: `Docs: none, because the page's words are its own source.`
`npm run check:docs-follow` fails a branch that changes code without either.
Run `npm run check:docs` too.

## 5. Verify and open a pull request

```sh
npm run verify
git push -u origin try/first-change
```

The pre-push hook runs `npm run verify` again; never skip it. Then open a
pull request. Work reaches main only through one, so the release notes list
it ([decision 0006](../decisions/0006-work-reaches-main-through-a-pull-request.md)).
For this scratch change, close it instead of merging, and delete the branch.

## What "done" means here

- `npm run verify` passes: format, lint, types, unused code, copy-paste, the
  import rules, tests with coverage, the records, the docs.
- Every word is in three languages.
- The docs say what is true now, or a commit says why none changed.
- The change is in a pull request, with a message that says what a company
  sees and has to do, if anything.

You have now used every part of a change to Kobble. A bigger one, a new
extension, follows the same steps: see
[add one of Kobble's extensions](../how-to/add-a-kobble-extension.md).

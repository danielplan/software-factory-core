# The repository's rules

[Knowledge base](../../index.md) · [Reference](../index.md) · [Conventions](index.md)

**Type:** Reference · Answers: which rules hold for every change to Kobble's core, and why?

[AGENTS.md](../../../AGENTS.md) is the source for these rules; this page
says each in short, with why and where it is checked.

| Rule                              | In short                                                                                                                                                                          | Checked by                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| No company in the core            | No company's name, products, people, data, decisions or wording: not in code, tests, docs or examples. The example company (`examples/acme/`) is made up.                         | review                                                                            |
| Only what is true for any company | What is true for one kind of product goes in its kit; what one company wants, in its repository or its own extension.                                                             | review                                                                            |
| The published API                 | Extensions and kits use only what `packages/core/src/index.ts` exports.                                                                                                           | review, the type check                                                            |
| Migrations                        | A change a company would have to make by hand comes with a migration in `packages/server/src/upgrade/migrations.ts`, for the release it comes in.                                 | `packages/server/test/upgrade.test.ts`                                            |
| Announcing changes                | A change to what a company sees or relies on says so in its commit message, with what a company has to do. Removing something is announced one release before. No changelog file. | review                                                                            |
| Standards first                   | What the platform provides first, then a widely used, maintained library; your own only when neither fits, saying why.                                                            | the libraries test, review                                                        |
| Built with its own kits           | The page follows the React web app kit and its libraries table; a job the table lacks gets a row, with why.                                                                       | `packages/kits/test/libraries.test.ts`, dependency-cruiser                        |
| Plain words                       | Simple, clear and consistent language in code, comments and docs, for curious, capable people who are not developers.                                                             | review                                                                            |
| Words in three languages          | Every word the page shows is in English, Italian and German, screen-reader labels and tooltips too. See [languages](../languages.md).                                             | `packages/dashboard/test/words-in-catalogue.test.ts`                              |
| Checks are never loosened         | Never loosen a check or add a lint-disabling comment without asking. Never skip the git hooks.                                                                                    | lefthook (`lefthook.yml`)                                                         |
| Pull requests only                | Commit on a branch, push it, open a pull request; never push to main. The release notes are written from merged pull requests.                                                    | [decision 0006](../../decisions/0006-work-reaches-main-through-a-pull-request.md) |
| Extensions plug in                | No code reaches into another extension; they meet at the core's plugs. `needs` says what must be installed with it, never something to call.                                      | dependency-cruiser, the records test                                              |
| The docs follow the code          | A branch that changes code brings the docs in line, or says why none need to change in a line `Docs: none, because …`.                                                            | `npm run check:docs-follow`, `npm run check:docs`                                 |

## The commands

At the root: `npm install` once, then `npm run verify`: the page's build,
format, lint, type check, unused code, copy-paste, the import rules of both
halves, tests with coverage, the example company's records, the docs check,
and the docs following the code. The pre-push hook runs it; the pre-commit
hook checks the format of what is staged.

One test file:
`node --experimental-strip-types --test-isolation=none --test packages/core/test/some.test.ts`.

## Per part

- [The server's conventions](server.md)
- [The page's conventions](page.md)

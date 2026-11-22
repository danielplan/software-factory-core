# Working on the software factory core

This repository is the core every company's software factory runs on. Changes
here reach every company with its next upgrade, so they are made with care.

## Rules

- **No company in the core.** No company's name, products, people, data,
  decisions or wording goes into this repository: not in code, tests, docs or
  examples. A lesson learnt in a company comes here written in general terms.
  The example company (`examples/acme/`) is made up.
- **Only what is true for any company** is core. Something true for one kind
  of product belongs in its kit; something only one company wants belongs in
  that company's repository or its own extension.
- **Extensions and kits use only the core's published API** (what
  `packages/core/src/index.ts` exports), never its internals.
- **A change a company would have to make by hand comes with a migration**
  in `packages/server/src/upgrade/migrations.ts`, for the release it comes
  in, so `software-factory upgrade` makes it; what it cannot decide alone it
  leaves to the owner, said in a line. How a release is made and reaches the
  projects: [releasing the core](docs/releasing.md).
- **Every change to what a company sees or relies on** (an extension point, a
  product description field, a file a company writes, a command) says so in
  its commit message, with what a company has to do, if anything; what a
  company would have to do by hand comes as a migration, or as a line the
  upgrade leaves to the owner. Removing something is announced one release
  before. There is no changelog file: it made every merge clash.
- **Standards before home-made code**: what the platform provides first, then a
  widely used, maintained library; write your own only when neither fits, and
  say why.
- **Kobble is built with its own kits.** The page (`packages/dashboard`) is a
  React web app: it follows `packages/kits/rules/react-web-app/` like any
  product a factory makes, and uses the library the kit's libraries table
  names for each job. A job the table lacks gets a row, with why, in the kit
  when other products would need it too, otherwise in the page's
  `BLUEPRINT.md` (`## Libraries`); `packages/kits/test/libraries.test.ts`
  fails on a package no table names. What still differs from the kit is
  listed in the blueprint and only shrinks.
- Simple, clear and consistent language in code, comments and docs. The people
  who use a factory are not developers, but are curious and capable.
- **Every word the dashboard shows goes through its words** (`packages/dashboard/src/i18n/`), in English, Italian and German, screen-reader labels and tooltips too: see [the design system's languages](docs/reference/design-system.md#languages). The test `packages/dashboard/test/words-in-catalogue.test.ts` fails on words written straight into a screen.
- Never loosen a check or add a lint-disabling comment without asking.
- **Work reaches main through a pull request.** Commit on a branch, push it
  and open a pull request; never push to main directly. A product's release
  notes (the Releases page) are written from the pull requests merged since
  the last release, so work pushed straight to main ships unlisted.

## Layout

- `packages/core/`: the core's code (`src/`, tests in `test/`).
- `packages/skills/`: the skills, as the files agents read (`skills/`), their guides and templates.
- `packages/knowledge-base/`: the knowledge base's structure (`template/`)
  and its checks (`bin/`, `src/`).
- `examples/acme/`: the example company.
- `docs/`: how the core is built and why.

## Commands

At the root: `npm install` once, then `npm run verify` (format, lint, type
check, unused code, copy-paste, tests with coverage, the docs check).
One test file: `node --experimental-strip-types --test-isolation=none --test packages/core/test/some.test.ts`.

The git hooks (`lefthook.yml`) run the checks on commit and push; never bypass
them with `--no-verify`.

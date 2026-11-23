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
  projects: [make a release](docs/how-to/make-a-release.md).
- **Every change to what a company sees or relies on** (an extension point, a
  product description field, a file a company writes, a command) says so in
  its commit message, with what a company has to do, if anything; what a
  company would have to do by hand comes as a migration, or as a line the
  upgrade leaves to the owner. Removing something is announced one release
  before. There is no changelog file: it made every merge clash. What a
  release brings for the team is in its GitHub release's notes, drafted on
  Kobble's Releases page in English, Italian and German
  ([decision 0016](docs/decisions/0016-release-notes-on-github-releases.md)).
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
- **Every word the dashboard shows goes through its words** (i18next, `packages/dashboard/src/i18n/locales/`), in English, Italian and German, screen-reader labels and tooltips too: see [languages](docs/reference/languages.md). The lint rule `i18next/no-literal-string` fails on words written straight into a screen.
- Never loosen a check or add a lint-disabling comment without asking.
- **What the core owns, it overwrites; customizations go through a declared
  place.** A file or value the core writes in a factory is written the same
  way in every factory, by setup and again by every upgrade, never left
  alone because a team edited it; what a team wants differently has a
  place of its own (such as `factory/hooks.yml`) or waits for a declared
  setting ([decision 0015](docs/decisions/0015-the-core-overwrites-what-it-owns.md)).
- **Work reaches main through a pull request.** Commit on a branch, push it
  and open a pull request; never push to main directly. A product's release
  notes (the Releases page) are written from the pull requests merged since
  the last release, so work pushed straight to main ships unlisted.
- **Extensions never talk to each other; they plug in.** An extension can
  be installed and removed, so no code reaches into another one: the core
  defines the plugs (the slots, what an extension brings: pages, Home
  blocks, kobolds, stages; its guides for a kobold; Sprocket's hand-offs,
  `server/src/kobble/support-plug.ts`), and each extension plugs in from its
  own code. `needs` says only what must be installed with it, never
  something to call. Removing an extension takes away everything it plugged
  in, and nothing else breaks.
- **The docs follow the code.** A branch that changes code also brings the
  docs in line (`docs/`, the README, `AGENTS.md`, a `BLUEPRINT.md`, the
  skills' guides), or says why none need to change in a commit message line
  `Docs: none, because …`; `npm run check:docs-follow` (part of verify)
  fails otherwise.

## Layout

- `packages/core/`: the core's code (`src/`, tests in `test/`).
- `packages/server/`: the local server and the `software-factory` command:
  core modules, `src/extensions/<id>/` and `src/app/` (its `BLUEPRINT.md`).
- `packages/dashboard/`: Kobble's page, a React web app: shared folders,
  `src/features/<area>/` (the core's areas), `src/extensions/<id>/` (one
  module per extension, as on the server) and `src/app/` (its `BLUEPRINT.md`).
- `packages/kits/`: one kit per kind of product, with its rules and starter.
- `packages/launcher/`: starts, watches and stops a product's parts.
- `packages/skills/`: the skills, as the files agents read (`skills/`), their guides and templates.
- `packages/knowledge-base/`: the knowledge base's structure (`template/`)
  and its checks (`bin/`, `src/`).
- `examples/acme/`: the example company.
- `docs/`: Kobble's knowledge base, in the shape every factory's has: how
  the core is built and why. Start at [its index](docs/index.md).

## Commands

At the root: `npm install` once, then `npm run verify` (format, lint, type
check, unused code, copy-paste, tests with coverage, the docs check).
One test file: `node --experimental-strip-types --test-isolation=none --test packages/core/test/some.test.ts`.

The git hooks (`lefthook.yml`) run the checks on commit and push; never bypass
them with `--no-verify`.

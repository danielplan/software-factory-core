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
- **Every change to what a company sees or relies on** (an extension point, a
  product description field, a file a company writes, a command) gets a line in
  `CHANGELOG.md` under "Unreleased", and says what a company has to do, if
  anything. Removing something is announced one release before.
- **Standards before home-made code**: what the platform provides first, then a
  widely used, maintained library; write your own only when neither fits, and
  say why.
- Simple, clear and consistent language in code, comments and docs. The people
  who use a factory are not developers, but are curious and capable.
- Never loosen a check or add a lint-disabling comment without asking.

## Layout

- `packages/core/`: the core's code (`src/`, tests in `test/`).
- `packages/method/`: the method, as the files agents read (`skills/`).
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

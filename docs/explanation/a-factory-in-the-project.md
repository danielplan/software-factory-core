# A factory in the project

[Knowledge base](../index.md) · [Explanation](index.md)

**Type:** Explanation · Answers: where does a company's factory live, how does a team share it, and how does it get a newer Kobble?

## The factory lives with the code

Each company keeps its products in its own repository and installs a
released version of this core there, pinned in its `package.json`. The
factory lives in the project, in its `factory/` folder, kept in the same
repository as the code. The company file, the product descriptions, the
knowledge base and the history change with the code they describe, in the
same commits and pull requests, and every copy of the code has them. The
folder's files are listed in [the factory folder](../reference/factory-folder.md).

A team uses one factory from several computers, one person each, and shares
it only through the repository. There is no server to host. What must not be
shared stays out of git: each person's own settings and secrets, and the
signals read from the live app, since git would keep what customers said for
ever. The kobolds' working copies sit next to the project, not in it.

The project's own `AGENTS.md` points to the factory's rules, so any agent
working in the code finds them.

## Core and company

The rule for any piece: if it would be true for a different company, it is
Kobble's (the core, an extension or a kit); otherwise it is the company's.

- **Kobble's:** the core, its extensions and kits, the skills the kobolds
  follow, the knowledge base's shape and checks.
- **The company's:** its products and their code, its knowledge base
  (`docs/`), its runs, its own rules and decisions, its made-up data, its
  words, its theme and its own extensions.

A company never edits the core. It uses an extension point, writes its own
extension, or asks for a change here. A lesson learnt in a company that would
hold for any company comes here, written in general terms.

## How a company gets a newer Kobble

- **The core.** The project pins a release in its `package.json`.
  `npx software-factory upgrade` brings the factory to that release: it runs
  the migrations of every release in between, refreshes what the factory
  owns in the project (the skills, the kits' tools, the knowledge base's
  missing shape, the git hooks and the core's scripts in `package.json`), writes the new version and runs the factory's checks. It
  says what it did and what it leaves to the owner, who reviews and commits.
  Inside Kobble, Settings › Updates offers a newer release as a card for the
  builder. See [versions](../reference/versions.md) and
  [Settings and updates](../reference/features/settings-and-updates.md).
- **Extensions and kits** come with the core, at its version. Each company
  switches them on or off in the Marketplace. A kit's rules are read-only in
  the company; the company and each product add their own on top.
- **The team's own work** changes through pull requests, like its code.

Every release is tried on the example company (`examples/acme/`) first.

## Kobble builds itself

This repository has its own factory in `factory/`, where Kobble's page and
server are the products. Because this repository is public, its explorations
stay on the computer they were made on and are not in git; in a company's
private repository they are shared through git like the rest of the factory.

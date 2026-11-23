# Setup

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how is a factory set up in a project, step by step with the setup coach?

## What it does

`npx software-factory`, run anywhere in the project, opens Kobble at
<http://localhost:4300>. Where the project has no factory yet, it starts
with setting up, one step at a time. The **setup coach** (Claude Code on
this computer, signed in with the owner's own account) hears what the owner
wants, explores the code with its own tools (never `.env` files) and fills
in the steps: Your product, Who it's for, Team and board, How Kobble works,
Bring over (only when there is something to bring) and, unseen, what each
product must keep.

Each step holds a few small cards, each a guess until the owner agrees;
behind them is one map the coach draws with its tool `draw`, an area per
step. The owner confirms a card, corrects its words in place, takes it
off, adds people, and answers the coach's questions, which wait as cards on
their step. The owner can talk instead of typing (see [voice](voice.md)).

## How it looks

Setting up sits in Kobble's own frame, the one every page has: the same
sidebar, with the project's name at the top and the steps as its rows (a
step's number in its tile, a check once it is behind, the step shown lit; a
step not reached yet cannot be opened); each step's title and one line
under it, with its buttons on the right (Back, and Let's go, Continue, Set
up Kobble or Open it); and Sprocket's bar at the bottom. The setup coach is
Sprocket: while it works, the bar says what it does in plain words (Reading
your project, Changing the cards, Setting up Kobble); opened, it holds what
the owner and Sprocket said, with a box to answer in or Talk. The step is
in the address (`#step-3`), so a reload stays there.

When the owner presses **Set up Kobble**, the coach builds the factory with
its other tool, `configure`: the project's factory folder, its products, the
tracker, extensions, settings and tools to install, only as the owner
agreed, each checked as it is saved; then the blueprints, the knowledge
base and the theme, until the factory's checks find nothing. The people in
Who it's for become personas and the starting points become explorations
waiting, each through its extension's plug. The last step offers one to
start with (**Open it**), or **Look around first**. Right after, the page
guides connecting where work is tracked: a GitHub board through the GitHub
CLI, or Jira Cloud with an API token, each checked before it is saved.

## Two kinds of start

- **Start something new:** the coach interviews the owner and writes the
  first knowledge pages; the first product comes from its kit's starter, or
  the framework's own generator. `software-factory new <name>` starts a new
  project.

## The project files the core owns

Some files at the top of the project are the core's: setup writes them, and
every `software-factory upgrade` writes them again, the same way in every
factory, so all are on the same page. What the team wants differently goes in
a place of its own, never by editing the core's
([decision 0015](../../decisions/0015-the-core-overwrites-what-it-owns.md)).

- **`lefthook.yml`,** the git hooks, whole (it says so at its top), which
  `npm install` at the top sets up:
  - **before a commit:** `software-factory check-format` on the staged
    files, which runs the `format:check` of each product they are in, and
    `software-factory check-docs` when a page changed;
  - **before a push:** `software-factory verify --pushed`, which runs the
    `verify` command of each product changed by the pushed commits no
    remote has yet (a new branch counts only its own).

  It ends by taking in (`extends`) the team's own hooks,
  `factory/hooks.yml`: the team's file, made from a short template when it
  is missing and never changed by the core.

- **In `package.json`** (made when missing): the core pinned, lefthook at
  the core's version, and the scripts `prepare` (`lefthook install`),
  `verify` (every product's `verify`, then the knowledge base's checks),
  `check:docs` and `check:format`. Every other key and script is the
  team's.

A `lefthook.yml` the core did not write is kept as
`factory/hooks-before-<version>.yml` (not taken in), and the owner is told to
bring the team's own hooks into `factory/hooks.yml`; a script the core
replaced is named with its old value. `software-factory check` says when one
of these files was changed by hand.

## How a new product is made

Each new product is a job the page shows while it works, in this order:

1. **Made:** its kit's starter is copied into the product's folder under
   the product's name, then the kit's own commands finish it (its packages
   installed); a kit without a starter makes it with the framework's
   generator. Where the starter lists its settings in `.env.example`, the
   product gets its `.env` as a copy of it. A folder that has code already
   is used as it is.
2. **Described,** once its code is there: `product.json` with the commands
   its kit finds in the code made (its `verify` check, how it starts, its
   world check), and the starter's `BLUEPRINT.md` (or a first one). What
   the starter brings is named too: a `prototype-world/` folder becomes the
   product's made-up `world`, and settings that name `DATABASE_NAME` give
   each working copy a database of its own
   (`"copyEnv": { "DATABASE_NAME": "<id>-{port:<id>}" }`).
3. **Formatted:** what the factory wrote is put in the shape of the
   product's own Prettier, with its settings, so the product's `verify`
   passes from the start.

Existing code is described the same way, without step 1, and nothing in
it is changed. Making comes before describing: written first, the
description would make the folder, and the starter would never be copied.

- **Bring an existing codebase:** each kit recognises its kind of product and
  the commands that already exist, and the owner confirms each product
  found. Nothing in the code is changed: the coach drafts each product's
  blueprint and the knowledge pages from the code as it is, and the
  product's own ways become its rules where they differ from the kit's.

## Where it lives

| Part                | Where                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The coach           | `packages/server/src/coach/` (`setup-coach.ts`, `configure.ts`, `map.ts`, `setup-records.ts`)                                                   |
| What it may install | `packages/server/src/installables.ts`                                                                                                           |
| Making products     | `packages/server/src/create-products.ts`, `packages/server/src/write-factory.ts`                                                                |
| The project's files | `packages/server/src/project-files.ts`, `packages/server/src/verify-command.ts`                                                                 |
| Finding products    | `packages/core/src/setup/detect.ts`, each kit's `detect`                                                                                        |
| Its guide           | `packages/skills/guides/setup-coach.md`                                                                                                         |
| The page            | `packages/dashboard/src/features/setup/`, connecting in `packages/dashboard/src/features/connect/`                                              |
| Its frame           | `packages/dashboard/src/components/layout/` (`shell.tsx`, `sidebar.tsx`, `page-head.tsx`, `sprocket-dock.tsx`), shared with the factory's pages |
| The files           | `factory/setup.json` (the setup conversation and its map)                                                                                       |

## Checked and not checked

Checked by tests: the coach's steps, map and records, setting up and
connecting (`setup-coach.test.ts`, `setup.test.ts`, `connect.test.ts`);
making products, from `configure` to the product made from its starter and
described (`setup-makes-products.test.ts`, `create-products.test.ts`); the
project files the core owns, their upgrade and the commands they run
(`project-files.test.ts`).
Not checked by a test: what the coach says about a real codebase.

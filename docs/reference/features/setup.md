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
step. There is no chat: the owner confirms a card, corrects its words in
place, takes it off, adds people, and answers the coach's questions, which
wait as cards on their step. The owner can talk instead of typing (see
[voice](voice.md)).

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
- **Bring an existing codebase:** each kit recognises its kind of product and
  the commands that already exist, and the owner confirms each product
  found. Nothing in the code is changed: the coach drafts each product's
  blueprint and the knowledge pages from the code as it is, and the
  product's own ways become its rules where they differ from the kit's.

## Where it lives

| Part                | Where                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| The coach           | `packages/server/src/coach/` (`setup-coach.ts`, `configure.ts`, `map.ts`, `setup-records.ts`)      |
| What it may install | `packages/server/src/installables.ts`                                                              |
| Finding products    | `packages/core/src/setup/detect.ts`, each kit's `detect`                                           |
| Its guide           | `packages/skills/guides/setup-coach.md`                                                            |
| The page            | `packages/dashboard/src/features/setup/`, connecting in `packages/dashboard/src/features/connect/` |
| The files           | `factory/setup.json` (the setup conversation and its map)                                          |

## Checked and not checked

Checked by tests: the coach's steps, map and records, setting up and
connecting (`setup-coach.test.ts`, `setup.test.ts`, `connect.test.ts`).
Not checked by a test: what the coach says about a real codebase.

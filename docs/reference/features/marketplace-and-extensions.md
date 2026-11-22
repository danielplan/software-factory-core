# The Marketplace and extensions

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how does a team install and remove extensions, what do its connections and kits show, and what can a team's own extension do?

## What it does

The Marketplace (`#extensions`) shows what the factory can do and the
services it works with, in three tabs:

- **Extensions:** Kobble's own and the team's own ("Made by your team"),
  installed or available. Installing one brings what it needs; removing one
  that another needs, or Factory, is refused. Removing one takes away its
  page, its Home blocks, its stage, its Sprocket hand-offs and its
  background work, and nothing else breaks.
- **Connections:** the slots, **Your code** (where branches and pull
  requests go) and **Your tasks** (where work is tracked), with the
  extensions that can fill each and the one in use. See
  [plugs and slots](../plugs-and-slots.md).
- **Product kits:** the kinds of product the factory knows.

The company's choice is kept in `factory.json`: Kobble's own extensions
(`core: true`) are on unless listed in `without`; others are on when listed
in `extensions`.

## Kobble's extensions

| Extension    | Brings                                                                                        | Needs   | Slots           |
| ------------ | --------------------------------------------------------------------------------------------- | ------- | --------------- |
| Factory      | the Factory page, four Home blocks, Bolt, the stages Factory and Done; always installed       | —       | `code`, `tasks` |
| Explorations | the Explorations page, a Home block, Doodle (and Tinker), the stage Explorations              | Factory | `tasks`         |
| Signals      | the Signals page, a Home block, Sieve, the stage Signals                                      | —       | `tasks`         |
| Personas     | the Personas page, Mimic                                                                      | Signals | —               |
| Releases     | the Releases page, the stage Release                                                          | Factory | `code`          |
| GitHub board | connecting a GitHub board through the GitHub CLI; fills `code` and `tasks`                    | —       | —               |
| Jira Cloud   | connecting a Jira Cloud project with an API token; fills `tasks` (its cards are not read yet) | —       | —               |

How one is built: [the extension module](../extension-module.md).

## A team's own extensions

A team's own extension lives in the company's factory folder,
`factory/extensions/<id>/extension.json`, with its guide files beside it.
The team asks Sprocket for one: **Make your own**, at the end of the
Extensions tab, opens Sprocket's conversation with the request started
(`features/marketplace/make-own.tsx`). Sprocket hands it to Doodle as an
exploration, the builder writes it, and the team reviews its pull request
like any change. It is a **description, never code
that runs** ([decision 0014](../../decisions/0014-team-extensions-are-descriptions.md)).

It can bring:

- **pages and Home blocks**, each a name, a line, an icon and parts, each
  part some text or a list (written there, or kept in a JSON file in its
  folder and read each time it is shown). Kobble's page draws them with its
  own components, so they look like Kobble's own: pages show in the sidebar
  under Your team (`#team/<id>`), blocks on Home;
- **stages**, placed by naming the stages they come `after` and `before`,
  with named **checks** a card passes before it moves on;
- **guides** for the builder (`"agent": "builder"`) or Sprocket
  (`"agent": "support"`), and **settings**;
- **needs** on other extensions, and the **slots** it uses.

It cannot start programs, be always needed, track work, fill a slot, or
reuse the id or anything another extension brings. Nothing loads without
passing these checks, and one that fails is left out with a plain line,
never stopping the others. The same checks run on the builder's branch
before its pull request. Settings › Advanced switches the team's own
extensions off all together.

## Stages

Each stage comes from an extension. When two fit the same place, Settings ›
Stages asks the team which comes first; the team can move any stage, and the
answer is kept in `factory/stages.json`. A card goes through Factory, the
team's stages between Factory and Done, and Done; only a team's stage is kept
on the card, with its passed checks and history.

## Where it lives

| Part                | Where                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Putting it together | `packages/core/src/extensions/registry.ts` (`assembleFactory`)                                                       |
| A team's extensions | `packages/core/src/extensions/team.ts` (`readTeamExtensions`), `packages/core/src/extensions/views.ts`               |
| Stages              | `packages/core/src/extensions/stages.ts` (`orderStages`), `packages/core/src/work/work.ts`                           |
| Installing          | `packages/server/src/extension-switch.ts`                                                                            |
| The page            | `packages/dashboard/src/features/marketplace/`, a team's page in `packages/dashboard/src/components/screen-view.tsx` |
| The builder's guide | `packages/skills/skills/factory/extensions.md`, with `packages/skills/skills/factory/extension-starter/`             |

## Checked and not checked

Checked by tests: installing and removing (`extension-switch.test.ts`), a
team's extensions and their checks (`team-extensions.test.ts`), the
starter, stages. Open: a page that does something, or a kobold that runs,
for a team's extension; a screen that moves cards through a team's stage.

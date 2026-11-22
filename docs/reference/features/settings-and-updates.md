# Settings and updates

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: what can the team set in Settings, and how do the team's folder and Kobble itself stay up to date?

## Settings

Settings (`#settings`) is about the factory itself. Its sections are in six
tabs, one shown at a time, each at its own address (`#settings/<tab>`):

| Tab           | What is in it                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Connections   | where work is tracked (the board, with its columns matched to the stages), the live app                                       |
| Stages        | the order of the stages; a clash between two is asked here                                                                    |
| AI models     | a model for talking, one for making prototypes and one for the builder; thinking before talking; the builder's cards at once  |
| Updates       | taking the newest work from GitHub, a newer Kobble, What's new in Kobble                                                      |
| This computer | the language Kobble speaks here; the desktop start                                                                            |
| Advanced      | the factory's own programs, and every other settings group: the usage log, the team's own extensions, an extension's settings |

A settings group has a topic, its `.env` file and its fields. The team's
settings are in `factory/team.env`, in git; each person's own, with their
secrets, in `factory/settings/`, not in git (see
[the factory folder](../factory-folder.md#settings)).

## Updates

The sidebar shows an update row above Settings only when something needs
the team: changes ready on GitHub, an update running, or a newer Kobble.

- **The team's folder** takes the newest main from GitHub without anyone
  using git, only when nothing can be lost, by itself every few minutes (on
  unless switched off). After it, what the changes need is installed when
  their package files changed; when that brings a new Kobble, the factory
  starts again on it with the parts that ran; otherwise the running products
  start again.
- **A newer Kobble** is looked for once a day. **Prepare the upgrade** puts
  "Upgrade Kobble to <version>" on the board for the builder; its pull
  request, once merged, reaches every computer the same way.
- **What's new in Kobble** shows what each version changed, from the
  `WHATS-NEW` files at the root, in the team's language.

## Smaller settings

- **The desktop start** (This computer): a file on the desktop that opens
  the factory with a double-click (`.cmd` on Windows, `.command` on macOS),
  for people who do not use a terminal.
- **The usage log** (off by default): a record of how the factory is used,
  for a study. Every change to an exploration is a line of JSON in a folder
  next to the project; each prototype change is a patch and, when it is
  opened, a picture at a computer's and a phone's width.

## Where it lives

| Part          | Where                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Settings      | `packages/dashboard/src/app/settings-page.tsx`, `packages/dashboard/src/features/settings/`; groups in `packages/core/src/settings/` |
| Updates       | `packages/server/src/updates/`, `packages/dashboard/src/features/updates/`                                                           |
| What's new    | `packages/core/src/whats-new.ts`, `packages/server/src/updates/whats-new.ts`                                                         |
| Desktop start | `packages/server/src/desktop-start.ts`                                                                                               |
| Usage log     | `packages/server/src/kobble/usage-log.ts`, `packages/server/src/kobble/usage-pictures.ts`                                            |

## Checked and not checked

Checked by tests: updates and their safety (`project-updates.test.ts`,
`updates-served.test.ts`), what's new, the desktop start, the usage log,
the settings tabs (`packages/dashboard/test/settings-tabs.test.ts`, on
`packages/dashboard/src/lib/settings-tabs.ts`).

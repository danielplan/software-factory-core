# Signals

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: where do signals come from, how are they sorted, and what can the team do with one?

## What it does

A signal is one thing heard: a bug, an idea or a question, in the words of
whoever said it. The Signals page (`#signals`) lists them in one list, each
with its source and type.

Signals come from:

- **The live app.** Kobble reads the app's export when the factory starts,
  every 30 minutes while it runs, and on **Sync now**. Each event becomes at
  most one signal, typed by its kind; its persona is the one whose customers
  include the event's anonymous customer. How the app offers the export and
  how it is connected: [the live export](../live-export.md).
- **Tests.** What a persona finds while living a few days in the app: see
  [Testing](testing.md).
- **The feedback board.** In the factory that reads it, the posts other
  teams sent: see [the feedback board](feedback-board.md).

Before launch, the empty Signals page sends the team to Personas, where the
first signals come from.

## Sorting

Each new signal goes through the **"already" check**
(`packages/core/src/kobble/already.ts`), a plain rule: an open exploration
that covers at least half of the signal's content words, or a fixed signal
that says nearly the same. The row then says where it already is. **Sieve**,
the sorter, is to take this over; today it only matches the feedback board's
posts to personas.

## What the team does with one

- **Fix:** first a popup where Bolt, the builder, takes a quick read-only
  look at the code (`fix-plan.ts`, guide `packages/skills/guides/fix-plan.md`)
  and says what it would do: what happens, the likely cause, what it would
  change, how we will know. **Looks right** makes a card on the team's
  board, in To do, through the `tasks` slot, with that plan as the card's
  agreed plan (so the builder does not plan again) and the signal's id in a
  hidden mark; **Change** asks Bolt to change the plan; **Cancel** makes
  nothing. A card is made once: a second Fix while the first is still being
  made is refused. The signal goes with the card, and the row then shows
  its column.
- **Explore:** added to the exploration the check found, or a new one that
  waits, through Explorations' `ideas` plug.
- **Dismiss.**

Sprocket can also send a signal on, to the builder or to Doodle.

## Rules that must hold

- Signals stay on the computer that read them: the factory's `.gitignore`
  names `kobble/signals/`. Each computer reads the live app for itself and
  keeps where it got to in `factory/kobble/signals/.sync.json`.
- The export is anonymised on the app's server: a customer is an id, never a
  name.
- Only Signals reads and writes the `signals` records; others use its plug.

## Where it lives

| Part             | Where                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The extension    | `packages/server/src/extensions/signals/`: `sync.ts` and `live-source.ts` (the live app), `actions.ts` (Fix, Explore, Dismiss), `fix-plan.ts` (Bolt's plan before Fix), `index.ts` (its plug) |
| Taking events in | `packages/core/src/kobble/take-in.ts`, `packages/core/src/kobble/live.ts` (the export's schema)                                                                                               |
| The page         | `packages/dashboard/src/extensions/signals/`                                                                                                                                                  |

## Checked and not checked

Checked by tests: the sync, taking events in, the "already" check, Fix,
Explore and Dismiss (`signals.test.ts`). Not built: Sieve sorting new
signals itself.

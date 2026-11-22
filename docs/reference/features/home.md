# Home

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: what does Home show, where do its blocks come from, and how does the team arrange it?

## What it does

Home (`#home`) is the first page: what waits for the team and the loop from
what comes in to what is done. It is built from the **blocks** the installed
extensions bring (`brings.blocks`):

| Block                                | Brought by         |
| ------------------------------------ | ------------------ |
| status, waiting, the loop, reviews   | Factory            |
| exploring                            | Explorations       |
| signals                              | Signals            |
| a team's own blocks (text and lists) | a team's extension |

Each extension gives its blocks' data through its `home` plug; Home, in the
core, asks every installed one (`GET /api/home`). The loop follows the order
of stages: Kobble's counted stages show while their extension is installed,
and a team's own stage shows how many cards it holds.

## Arranging it

**Arrange Home** lets the team move blocks, **Add a block** and **Reset
layout**. The arrangement is kept for everybody in `factory/home.json`. With
no file, Home shows what it always showed. A block whose extension is
removed leaves Home and comes back in its place with it; a block an
extension brings later starts off Home.

## Rules that must hold

- Home never imports a feature: the page's app hands it the blocks each
  installed feature brings (`packages/dashboard/src/app/home-blocks.tsx`).

## Where it lives

| Part             | Where                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| The page         | `packages/dashboard/src/features/home/`                                    |
| The layout       | `packages/server/src/home-layout.ts` (`GET` and `POST /api/home-layout`)   |
| The blocks' data | `packages/server/src/plugs/home.ts`, `packages/server/src/app/assemble.ts` |

## Checked and not checked

Checked by tests: the layout and its blocks, the blocks' data from the
installed extensions' plugs (`home-layout.test.ts`, `home.test.ts`).

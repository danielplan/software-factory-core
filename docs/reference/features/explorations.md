# Explorations

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how does the team think an idea through with Doodle on a whiteboard, and how is the agreed version handed off as a card?

## What it does

Explorations (`#explore`) are where the team works out what to build for a
problem, with **Doodle**, the explorer. An exploration starts from a signal
(Explore), from a sentence, from Sprocket, from the starting points setup
found, or from an open card in the board's Backlog, which waits in
Explorations until someone explores it.

## The whiteboard

Each exploration has one board, a **whiteboard** to think on (React Flow, pan
and zoom). On it: the problem, what was heard, choices with options A, B,
C and Doodle's recommendation, one living diagram (Mermaid), rare notes, the
prototype, and pictures a person pasted or dropped in. Arrows join things,
with short labels. Each thing is a **sketch** or **agreed**. The board is
laid out left to right in columns along its arrows (ELK, layered): an arrow
leaves a thing on its right and comes in on the left of the next, so arrows
never loop. A thing a person moved stays where they put it; the others
keep their column and move down in it where a moved thing is, so none ends
up under it (`packages/dashboard/src/lib/around-placed.ts`). The
Explorations overview shows each board in small, laid out the same way.

Doodle thinks before it answers, then keeps **one living picture** changed in
place, with decisions folded into it, open points marked "?", and few notes
([decision 0005](../../decisions/0005-whiteboard-not-pipeline.md)). It uses
the board's tools: look at the board, add notes, diagrams and choices,
change and remove things, link them, point at one, mark it agreed or a
sketch, choose an option, and park another idea as an exploration of its
own.

People move things, switch sketch and agreed, choose an option, add pictures
and click things to attach them to what they type next; Doodle hears what
they did with their next words. Words sent while it answers join that
answer, and **Stop** ends it.

## The prototype

When the idea changes a screen, Doodle asks **Tinker**, its maker, for a
prototype in the real app, with variants to switch between: see
[prototypes](prototypes.md).

## The hand-off

**Hand off** (on the team's yes) needs the prototype **agreed**, with its
variant chosen. An idea that changes no screen needs no prototype, only its
choices, notes or diagrams agreed. The button stays off until then, and says
why. A prototype that was never made (its copy could not be made, so its
branch is nowhere) holds nothing to build from: the hand-off leaves it out,
and the board's agreed choices and notes go instead.

1. A spec writer writes the card from the conversation, the board and the
   agreed prototype, without reading the code: a short card in the plan's
   four steps (Product, UX/UI, Architecture and design, Testing), with what
   nobody discussed marked _Proposed_
   ([decision 0004](../../decisions/0004-hand-off-card-is-the-plan.md)).
2. It reads the board again before the card is made, and refuses when the
   agreement changed.
3. The card goes to **To do** on the team's board, through the `tasks` slot:
   the go-ahead to build. `handoff.md` keeps a copy.
4. The exploration keeps the card's number and closes. The prototype's copy
   is removed; its branch stays, and the builder starts from its code and
   look ([decision 0003](../../decisions/0003-build-from-the-agreed-prototype.md)).

The page shows each step of the hand-off while it runs.

## Rules that must hold

- Only Explorations reads and writes the `explorations` records; others use
  its `ideas` plug.
- A prototype nobody agreed on, or an agreed one with variants and none
  chosen, is never handed off.

## Where it lives

| Part            | Where                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| The extension   | `packages/server/src/extensions/explorations/`: `board-tools.ts`, `talks.ts`, `spec-writer.ts`, `handing-off.ts`, `ideas.ts` (its plug) |
| The board shape | `packages/core/src/kobble/board-shape.ts`                                                                                               |
| The page        | `packages/dashboard/src/extensions/explorations/` (the board in `board/`)                                                               |
| The guides      | `packages/skills/guides/exploration-coach.md` (Doodle), `packages/skills/guides/handoff-spec.md` (the card)                             |
| The files       | `factory/kobble/explorations/X-<n>/`: `exploration.json`, `board.json`, `conversation.md`, `pictures/`, `handoff.md`                    |

The routes are under `/api/kobble/explorations` and
`/api/kobble/exploration?id=…`; each change is told to the page as a
`kobble-changed` event.

## Checked and not checked

Checked by tests: explorations and their versions, the board's acts, the
hand-off and its refusals (`explorations-handoff.test.ts`), the spec
writer, the ideas plug. Not checked by a test: what Doodle draws; that is
its guide's job.

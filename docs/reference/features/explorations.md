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
prototype, and what the team adds themselves (pictures, links, notes, sketch
cards and pen marks, below). Arrows join things,
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

### The team's own things

A toolbar floats at the foot of the board: **pen · note · picture · link**.
What the team adds is blue and carries a "Yours" tag, so it reads apart from
Doodle's things. It is kept with the board (`board.json`, written by the
person, `by: "person"`), so it survives a reload and Doodle reads it:

- **Pen.** A stroke on empty space opens a **sketch card** around it (plain
  white, it grows with its strokes); a stroke that starts inside it joins it,
  one that starts outside opens another. A stroke on any other card stays
  inside that card and moves with it. The pen draws only inside one card:
  Doodle is given a picture of the card with the strokes on it (a stroke on
  its own is only a trail of dots). A mark on another card is told as its
  strokes alone, at the card's size and place. Esc leaves the pen; the X or
  Delete takes a card or a mark off.
- **Note.** A double-click on empty space (or the note tool) opens a one-line
  box. Doodle hears a note at once, as the person's own words.
- **Picture and link.** The picture tool opens a picker. Ctrl/Cmd+V anywhere
  on the board (not while typing in the chat or a note), or dropping a
  picture file or a link dragged from a browser, places a picture card or a
  link card at the pointer, or in the middle of the view when the pointer is
  off the board. A link card shows the page's preview picture, its title in
  bold and the site's icon and name; a click opens it in a new tab. Kobble's
  own server reads the page (title, site, preview picture, icon; no key, and
  only pages on the open web, never an address on the computer or its local
  network). The simple card (the site's icon, the address and the title) is
  shown at once and when a page shares no preview, is slow or fails.
- **Taken in.** A thing fades to "Taken in" only once Doodle has answered
  with it in front of it, never by itself. Marks, pictures and links come with
  the person's next message; only the person removes a thing. Doodle may move
  and regroup what the team added, never change or remove it.
- **The view stays still.** Adding something does not re-fit or move the
  view; it still re-fits for what Doodle adds.

Not possible yet: arrows drawn between two cards, and words inside a sketch.

## While Doodle reads

On an empty board, while Doodle answers, the board shows a **reading card**
in the middle: three stages (reading your idea, learning how the product
works, drawing on the board), each ticked off when Doodle actually reports
it, and under the current stage the plain step it is on ("Getting to know the
product", "Looking at how the product looks", "Looking for where this
happens", "Drawing a choice"). The chat and the header say the same step in
the same words. Nothing is timed, and the card says nothing about how long it
takes. The card goes when the board has something on it, and shows only on an
empty board.

How the words get there: the **server sorts, the page words**. For each action
Claude Code reports, the server (`doingOf` in the core's `kobble/doing.ts`)
picks a kind from what the action touches (the product's settings, the design
guide, a search, a drawing tool, anything unknown) and sends only that kind
(`talk.doing`), never English. The page looks the kind up in its word list
(`explore.doing` in `i18n/locales/`, English, Italian and German), so a step
reads the same in every place. The stage moves by the kind too (`talk.step`,
from `coach/talk.ts`): the first read or search moves it to learning how the
product works, the first drawing action to drawing. Drawing actions reach the
page like the others, so "Drawing a choice" is a real step. An action that fits
no kind reads "Looking around the product". The words are a fixed list, not
Doodle's own: it costs nothing extra and needs no second model. Each step stays
on show a few seconds (`use-doing.ts`), so a fast run of reads can be followed.
The Factory's step list for developers keeps its full details; only what the
team sees while Doodle works is in everyday words, never "code", "files",
"page" or "description".

Tinker's line while it makes a prototype is sorted the same way: the run keeps
the kind of the maker's last action (`doing`, next to the raw `activity` the
kobold who talks with the team reads), and the board card words it.

When Doodle really stops (Claude Code failed or was cut off), the card puts
a red cross on the step it stopped at and says why in a red line, in plain
words and in the language shown (`stopWords` in `i18n/server-texts.ts`; the
chat says the same), with a small **Try again** link at its end. The link
(`POST /api/kobble/explorations/again`) takes the person's last words back
and says them again, so the steps start over and the chat has them once; with
no words yet it is Doodle's first look again.

## The prototype

When the idea changes a screen, Doodle asks **Tinker**, its maker, for a
prototype in the real app, with variants to switch between: see
[prototypes](prototypes.md).

## The hand-off

**Hand off** (on the team's yes) needs the prototype **agreed**, with its
variant chosen. An idea that changes no screen needs no prototype, only its
choices, notes or diagrams agreed. The button stays off until then, and says
why in words beside it (a switched-off button shows no tooltip): which of the
prototype, its variant or something on the board is still to be agreed
(`hand-off-needs.ts`, the same rules the server refuses by). A prototype that
was never made (its copy could not be made, so its branch is nowhere) holds
nothing to build from: the hand-off leaves it out, and the board's agreed
choices and notes go instead.

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
  chosen, is never handed off. The way out of a prototype nobody wants
  (a broken first version, say) is to take it off the board, which Doodle
  does on the team's word; the refusal says so.

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

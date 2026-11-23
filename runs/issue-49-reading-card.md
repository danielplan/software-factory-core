# A board that shows it's working (card #49)

## Request

[Card #49](https://github.com/danielplan/software-factory-core/issues/49),
agreed in exploration X-16 (prototype `proto/X-16-a`, variant A, built on
the steps of variant B): while the explorer reads, the empty board shows a
card with its steps, ticked as the explorer reports them; when it really
stops, the card says where and why and offers "Try again". Products:
Kobble's page and Kobble's server.

## Plan and checks

Built from the prototype's `reading-board.tsx`, keeping its look, with
the prototype's stand-ins replaced:

- The seconds timer and the made-up stop (`prototype-run.ts`,
  `prototype-switch.ts`, the jump to X-0, `?variant=` and `state=stopped`)
  are left out, and so are variants B, C and D.
- **Steps from reports.** `Talk` (`coach/talk.ts`) keeps `step` for the turn:
  0 reading what it was given, 1 once Claude Code reports reading or
  searching, 2 once it uses a drawing tool. The explorer's talk view
  carries it (`talk-view.ts`, new, to keep `talks.ts` under its size limit).
- **Reason.** `Talk` takes `who`, so the explorer's failure reads "The
  explorer stopped: …". The page says it in the language shown
  (`stopWords`, `server-texts.ts`), short on the card, with its next step in
  the chat.
- **Try again.** `POST /api/kobble/explorations/again` takes the owner's last
  words back (nothing came after them, the answer failed) and says them
  again, so the chat has them once; with no words yet, it is the explorer's
  first look again.
- Words: `explore.reading.*` and `explore.stopped.*` in en, it, de.
- Tests: `talk-steps.test.ts` (server), `reading-card.test.ts` (page).
- Docs: the explorations feature page.

Decisions (cheap to change, decided here):

- **Open point: steps on a board that already has things?** Only on the
  empty board, as the card says ("adds a reading card to the empty
  exploration board"). A busy board shows Doodle's work in the chat, as
  before.
- **Open point: which reports tick which step?** Reading or searching
  (`Reading …`, `Searching …`, `Looking …`, the lines the talk already
  shows) tick "Reading the page" and start "Looking at the code"; a
  drawing tool of the explorer (`add_note`, `add_diagram`, `add_choice`,
  `change_thing`, `link`, `make_prototype`) ticks "Looking at the code" and
  starts "Drawing". The page itself is what the explorer is given in its
  prompt, so it is read until the first look at code.
- The card is shown by its own rule (`readsTheBoard`), not by the
  prototype's: an empty board, not waiting, answering or stopped.
- No migration: nothing a company writes or runs changes.
- Try again does not keep what the owner had attached from the board with
  their last words (the page does not keep them after sending).

## Status

in progress

## Result

## Later

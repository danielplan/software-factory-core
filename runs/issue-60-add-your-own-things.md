# Adding your own things to the board (card #60)

## Request

[Card #60](https://github.com/danielplan/software-factory-core/issues/60),
agreed in exploration X-20 (prototype `proto/X-20-a`, variant A): the team
adds their own things to an exploration's board: freehand sketches, pen marks
on cards, one-line notes, pictures and links with a preview. Doodle hears
them. Products: Kobble's page and Kobble's server.

## Plan

Built from the prototype's variant A (`board/mine/*`, `canvas.tsx`,
`use-picture-drop.ts`, `talk-panel.tsx`, the words). Left out: variant B, the
Sketch tool, `variant.ts` and `?variant=`/`?state=`, the seeded made-up
drawing and note, the "Draw on a card" hint, the made-up previews
(`preview.ts`) and the browser-only store (`mine-state.tsx`'s localStorage).
Taken only the board changes from the branch, not its other files.

Decisions:

- **Kept with the board.** New kinds in the core's board schema (`link`,
  `sketch`, `mark`) beside the existing `note` and `picture`, all with
  `by: "person"`, plus an optional `taken` on every thing. A pen stroke is a
  `mark` on a card (`on`, points from the card's corner); a sketch card has
  no size of its own: the page grows it around its marks, so the board stays
  small. Existing boards stay valid, so no migration is needed.
- **What Doodle gets.** A note is said to Doodle at once (`sayNow`); a
  link, a mark and a picture come with the person's next message
  (`personDid`). For a drawing the page uploads a picture of the card with
  the stroke on it (a stroke alone is only a trail of dots); the board text
  tells Doodle to read it. A mark on a card that is not a sketch is a picture
  of the marks alone at the card's size and place (the page cannot take a
  picture of another card).
- **Taken in** only once Doodle has answered with the thing in front of it
  (`ExplorationTalks.takenIn`); a failed answer leaves it and it is heard
  again with the next words. Never by time.
- **Link previews** are read by Kobble's own server with
  `open-graph-scraper` (a maintained library; no key), only for pages on the
  open web (no numbers, no `localhost`, no local network), with timeouts and
  size limits. The simple card is saved first and gets its preview when it is
  read; a page that shares nothing, is slow or fails keeps the simple card.
- **Doodle may move, never change or remove** what a person added
  (`applyAct`, for notes, pictures, links, sketches, marks).
- Links accept only `http` and `https`.

## Stages

1. Server: schema, acts, link previews, taken in, Doodle's text. Done, with tests.
2. Page: the board's own layer (sketch cards, marks, notes, link cards),
   toolbar, paste and drop, the view that stays still, chat lines, words in
   en/it/de, its checks. Not started.
3. Docs, a run in the browser with screenshots, the verify run. Not started.

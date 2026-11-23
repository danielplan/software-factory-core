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

- **Page.** The team's notes, links, sketch cards and marks are drawn on
  the board's own layer (`board/mine/`), read from the board's things
  (`own.ts`), not cards the layout places; a person's picture stays a card
  but is not laid out (`ownedByPerson`), so adding it never moves the view.
  What was sent and not yet answered shows at once as pending things
  (`held.ts`, `sending.ts`) and goes when the board is read again. The
  Doodle chat shows a note as the person's own message (it is said to Doodle);
  the prototype's local "Doodle received …" chat lines are left out, as
  nothing else in the chat is made up. A paste or drop that is a bare word
  like `report.pdf` is not a link; only the typed link box accepts an address
  without `https://`.
- **Differences from the prototype, with why.** No Sketch tool, variant
  switch, "Draw on a card" hint or made-up drawing and note (the card says
  so); pen marks on a card that is not a sketch are given to Doodle as the
  strokes alone (the page cannot photograph another card), with the card's id
  and size; a note's chat line is Doodle's real answer.
- **Opens, as the card said:** arrows between two cards and words inside a
  sketch are not possible; whether a faded "taken in" mark reads clearly is
  looked at in the screenshots below (marks fade to 45%, cards to 60%).

## Checked

- Rules (tests): server `own-things.test.ts` (strokes: new sketch card, join,
  other card, erase, card with its marks removed; note heard at once and
  taken in after the answer; link preview, no preview, slow or failing page;
  only the open web; Doodle cannot change or remove, can move; Doodle's text;
  taken in only after the answer); page `own-things.test.ts` (card grows
  around strokes, which card the pen is on, what a paste or drop becomes,
  addresses, the layer, the view's re-fit); the words test.
- In a browser (headless, on this copy's demo project): pen on empty space
  opened a sketch card, a stroke inside joined it, one just outside opened a
  second card, a loop round a card stayed on it, a double-click placed a
  note, a pasted address and a dropped picture landed where the pointer was,
  a link to a real page showed its preview, a sketch card dragged with its
  strokes, a reload kept everything, and Doodle answered about the drawings
  and the note and they faded to "Taken in". The view did not move for any
  of it (the transform stayed the same); it did move once when Doodle itself
  changed the diagram.

![the toolbar on the board](runs/issue-60-add-your-own-things/3-board-toolbar.png)
![a sketch, a mark on a card and a note](runs/issue-60-add-your-own-things/4-drawn.png)
![after a reload, taken in, links and pictures](runs/issue-60-add-your-own-things/6-after-reload.png)
![a link with its preview, a sketch card dragged](runs/issue-60-add-your-own-things/7-link-preview-drag.png)

## Not checked

- Italian and German on screen (the words test checks every key is in all
  three); small windows; a prototype card marked with the pen (a running
  prototype is an iframe card, treated like any other card).

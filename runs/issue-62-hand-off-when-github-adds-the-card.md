# Hand-off when GitHub adds the card by itself (card #62)

## Request

[Card #62](https://github.com/danielplan/software-factory-core/issues/62),
agreed in exploration X-21: on a GitHub board that adds new issues to itself,
the factory's "create issue, add to board" step failed with "Content already
exists in this project", leaving a stray issue and a hand-off that could not
be tried again. Product: Kobble's server (and one message on its page). No
prototype.

## Plan and checks

- **One fix, in the shared step** (`github/cards.ts` `create`, with
  `github/on-board.ts`): create the issue, tell the caller at once (`made`),
  add it to the board. "Content already exists in this project" is accepted;
  the item is then looked for on the board (never checked before adding: GitHub
  may add it a moment later and the check could still clash). An item GitHub
  answers with is used as it was.
- **Remember at once.** `Cards.create` takes a `made` callback, told the
  issue as soon as it exists. The hand-off (`explorations/actions.ts`) saves it
  on the exploration's `issue`, the field an exploration that started from a
  Backlog issue already has. Handing off again then takes the existing path
  (write the plan, move to To do) after `Cards.bring`, a new method that adds
  the issue to the board when it is missing. Other callers of `create`
  (signals, updates, the `card new` command) get the accepting and the
  waiting without a callback.
- **Waiting.** 15 looks, 2 seconds apart (about 30 s); `githubCards` takes the
  numbers as a third argument, so tests wait 0. After that: `Issue #N was
made, but it is not on the board after waiting …` (the number named); the
  dashboard says it in en/it/de (`handOffProblem` in `server-texts.ts`).
- Tests: `server/test/card-create.test.ts` (already exists and found; late;
  never, with the number and the issue told at once; adding fails otherwise;
  `bring`; a hand-off failing between creating and adding, tried again, makes
  no second issue), `dashboard/test/i18n.test.ts` (the message). The pretend
  GitHub gets a board that adds issues by itself (`Taking`).
- Not done: the browser run-through the card proposed. Nothing on the page
  changes but one message, and a board that adds issues by itself needs a real
  GitHub.

Decisions (cheap to change, decided here):

- **Where the remembered issue is kept:** the exploration's `issue`, not a new
  field and not `work` (`work` means handed off in the page and the ideas
  plug). It is never cleared: after the hand-off it is the card, as for an
  exploration that started from a Backlog issue, and the Ideas list already
  leaves such issues out.
- **Waiting 30 s, every 2 s:** GitHub's workflow usually adds an item in
  seconds; longer would leave the page on "card" for too long.
- **No migration:** nothing a company has to do by hand.

## Status

done

## Result

Server and page changed as above; docs in `docs/reference/features/explorations.md`
and `languages.md`.

## Later

- A remembered issue the team closed or deleted by hand before trying again
  fails with GitHub's own words; not handled.
- `readProject` reads only the first 100 items of a board; a bigger board
  could miss the card while waiting.

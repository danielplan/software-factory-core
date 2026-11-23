# Hand off stayed greyed out, and did not say why (card #44)

## Request

[Card #44](https://github.com/danielplan/software-factory-core/issues/44),
a signal from the team: Doodle said everything was decided, but **Hand off**
stayed greyed out, with no way to see why or what was missing.

## What was found

The button is off until the board holds what the builder builds from:

- a prototype on the board is agreed (and its variant chosen when it has
  several), or
- with no prototype, a choice, note or diagram is agreed.

The page had a tooltip for one of these cases, but a switched-off button
takes no pointer (`disabled:pointer-events-none`), so the tooltip never
showed. The other cases had no words at all. The page also let the button
on when the agreed prototype had several variants and none was chosen; the
server then refused it.

## Built

1. `hand-off-needs.ts`: one plain rule, `handOffMissing(things)`, the same
   rules the server refuses by (`prototypeToHandOff`): `prototype`,
   `variant`, `something` or nothing missing. Tested in
   `packages/dashboard/test/hand-off-needs.test.ts`.
2. The Hand off button uses it: off while something is missing, with the
   reason as visible text beside it (and `aria-describedby`), in English,
   Italian and German (`explore.handOffMissing.*`, replacing the old
   tooltip text `agreePrototypeFirst`).
3. Docs: the explorations reference says where the reason shows.

## Decisions

- Visible text rather than a tooltip: a disabled button shows none, and a
  touch screen has no hover. Cheap to change later.
- Not changed: how Doodle decides "everything is decided"; the card only
  asks the page to say what is missing.

## Checked

Unit tests for the rule and the words; type check; lint. Not looked at in
the browser (no screenshots).

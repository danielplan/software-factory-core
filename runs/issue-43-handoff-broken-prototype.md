# Doodle cannot hand off from the agreed picture when a broken first prototype is in the way (card #43)

## Request

[Card #43](https://github.com/danielplan/software-factory-core/issues/43),
a signal from a team member (S-0010): Doodle offered to send the idea off
from the agreed picture, then said it could not because the broken first
version of the prototype is in the way. The team could not hand off and had
no way forward they understood.

## Plan and checks

Cause, found in the code: a prototype could never leave the board once made
(`withoutThing` refused it), and a board with any prototype is handed off
only when one is agreed (`prototypeToHandOff`). A first prototype that came
out broken, with the team agreeing on a picture instead, left the board in a
corner: nothing agreed to hand off, nothing to take off, and the page's hint
only said "agree on the prototype".

The fix, kept small and inside the rule that a prototype the team worked on
is never dropped on the way to the builder (the team's word is needed, and
the branch stays):

1. A prototype nobody agreed on can be taken off the board (Doodle's
   `remove_thing`, on the team's word). An agreed one stays until it is
   marked a sketch; one being made waits until it is ready; what runs of it
   stops. Its branch stays.
2. The hand-off refusal, the page's hint (en, it, de), Doodle's tool
   descriptions and its guide say the way out, and tell Doodle to settle a
   prototype nobody agreed on before offering the hand-off.
3. Tests: the board acts, the hand-off after taking prototypes off, Doodle
   removing prototypes through its tools. Docs: explorations and prototypes.

Decisions (cheap to change, so decided here):

- No button on the page to take a prototype off: Doodle does it when asked,
  as it does for everything on the board; the hint says to ask. A button
  would need its own words, states and confirmation.
- No migration: nothing a company writes changes; Doodle's guide is core-owned
  and overwritten by the upgrade.
- "Broken" is not detected: whether a prototype works is the team's call, so
  the rule is about agreement, not about a failure flag.

## Status

done: server, tests, hint in three languages, guide, docs.

## Result

Tests for the board acts, the hand-off and Doodle's tools pass. Not tried:
Doodle's judgement in a real conversation (it needs a real Claude).

## Later

- A button on the board to take a prototype off, for people who do not want
  to ask Doodle.
- A made-again prototype with the same letter reuses the old copy and branch
  of the broken one; a fresh start for it is not built.

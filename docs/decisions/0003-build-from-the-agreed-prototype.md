---
status: accepted
date: 2026-11-21
decision-makers: the maintainer
---

# Build from the agreed prototype and its variant

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

Two cards reached the builder "without a prototype" although the team had
worked on one: one prototype was never marked agreed, the other was agreed
while the hand-off was already writing the card from the board it had read
before. The card called the prototype "not the reference", and the builder,
told only that the card's text is the plan, wrote the screens anew. How do
we make sure what the team agreed is what gets built?

## Considered Options

- Describe the prototype in the card's words and let the builder build from
  them.
- Hand off only an agreed prototype, with its variant chosen, and build from
  its code and look.

## Decision Outcome

Chosen: build from the agreed prototype. The hand-off refuses a board with a
prototype nobody agreed on, or an agreed one with variants and none chosen,
and says what to agree; it reads the board again before the card is made and
refuses when the agreement changed. An idea that changes no screen hands off
without a prototype. The card says the agreed variant's screens, layout,
components, styles and words are final; the builder starts from the
prototype's branch, side by side with it, replacing only its stand-ins, and
asks when a card calls a named prototype "not the reference".

### Consequences

- Good, because what the team clicked through is what it gets.
- Bad, because a team must agree the prototype in a step of its own before
  the Hand off button works.

## More Information

[Explorations](../reference/features/explorations.md),
[prototypes](../reference/features/prototypes.md).

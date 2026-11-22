---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# The hand-off card is the plan

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

With no planning stage ([decision 0002](0002-no-planning-stage.md)), the card
the hand-off writes is all the builder gets. A long spec repeated the
conversation, and parts nobody talked about were either missing or looked
as agreed as the rest. What should the card hold?

## Considered Options

- A free spec, as long as the conversation was.
- A plan and a spec, written one after the other.
- One short card in the plan's four steps, with what nobody discussed marked
  as proposed.

## Decision Outcome

Chosen: plan and spec are one. The spec writer writes a short card from the
conversation, the board and the agreed prototype, without reading the code,
in the plan's four steps: Product, UX/UI, Architecture and design, Testing,
then open points. What nobody discussed is filled in and marked
_Proposed:_, so the builder can tell it from what was agreed.

### Consequences

- Good, because the builder gets one short plan, in the same shape every
  time, and knows what it may change.
- Bad, because a proposed part may be wrong; the team sees it in review.

## More Information

The guide is `packages/skills/guides/handoff-spec.md`.

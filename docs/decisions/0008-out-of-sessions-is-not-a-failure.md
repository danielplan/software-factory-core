---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# A builder out of sessions is not a failure

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

A build is up to three sessions in a row. When the builder used all three
with the work not finished, the card was stuck like a failure: the team read
that something went wrong, and had to write a hint to go on, though the
builder was only not done yet. How should that card look, and how does the
team let it go on?

## Considered Options

- Treat it like any stuck card: a failure, waiting for a hint.
- Give it its own note and a **Continue** button, a hint optional.
- Give the builder more sessions, without asking.

## Decision Outcome

Chosen: its own note and **Continue**. The card says the builder worked its
sessions and is not finished. On the Factory page its button is Continue, a
hint optional, which gives it three more sessions; moving the card to To do
does the same. Two sessions in a row that add no commit are still a failure.

### Consequences

- Good, because the team reads the card as it is, and one press lets it go
  on.
- Good, because a person still decides whether more sessions are worth it,
  or the card should be split.
- Bad, because a big card can take several presses.

## More Information

`packages/server/src/extensions/factory/builder/sessions.ts`;
[the Factory](../reference/features/factory.md#stuck-cards).

---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# Record decisions as MADR records

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

Choices about Kobble are made in conversations, explorations and commits.
Without one place for them, the reasons are lost and the same question is
asked again. Every company's factory keeps its decisions the same way, so
Kobble's own knowledge base does too.

## Considered Options

- Decisions only in the commits and runs where they were made.
- One numbered record per decision, in MADR.

## Decision Outcome

Chosen: one numbered record per decision, in
[MADR](https://adr.github.io/madr/), in `docs/decisions/` (`NNNN-title.md`,
with `status`, `date` and `decision-makers`). A change that makes a choice
adds its record in the same branch.

### Consequences

- Good, because the options and reasons stay next to the choice, and the
  docs check holds each record to its shape.
- Bad, because each choice takes a few minutes to write down.

## More Information

Copy a record to start a new one: change the number, the title, the front
matter and each section. A decision that is replaced keeps its record, with
`status: superseded by NNNN`.

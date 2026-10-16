---
status: accepted
date: 2026-01-01
decision-makers: the company's owner
---

# Record decisions as MADR records

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

Choices about the products are made in conversations and runs. Without one
place for them, the reasons are lost and the same question is asked again.

## Considered Options

- Decisions only in the runs where they were made.
- One numbered record per decision, in MADR.

## Decision Outcome

Chosen: one numbered record per decision, in MADR, in `context/decisions/`
(`NNNN-title.md`, with `status`, `date` and `decision-makers`). A run that
makes a choice links its record.

### Consequences

- Good, because the options and reasons stay next to the choice.
- Bad, because each choice takes a few minutes to write down.

## More Information

Copy this record to start a new one: change the number, the title, the front
matter and each section.

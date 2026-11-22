---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# Sprocket is the guide

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

Sprocket, at the bottom of every page, answered questions and also did some
work itself, calling the other extensions' code directly: adding
explorations and personas, answering on cards. People could not tell who was doing what, and
removing an extension left Sprocket offering what was not there. What is
Sprocket for?

## Considered Options

- Sprocket as a helper that does small jobs itself.
- Sprocket as the guide: it takes people to the right place and hands work
  on to the kobold whose job it is, doing nothing alone.

## Decision Outcome

Chosen: the guide. Sprocket finds out what people want, takes them to the
right page (`go_to`), and hands work on (an idea to Doodle, a mission to
Mimic, an answer to the builder) once they agree. It reads the project and
changes nothing. Extensions plug into it: each installed one gives its
hand-offs and a paragraph about itself through the `support` plug, so
Sprocket hears only what is installed.

### Consequences

- Good, because each job has one kobold, and people meet that kobold where
  it works.
- Good, because a new extension plugs in without changing Sprocket.
- Bad, because some answers take one more step: Sprocket takes people there
  instead of doing it.

## More Information

[Sprocket](../reference/features/sprocket.md); the guide is
`packages/skills/guides/support-kobold.md`.

---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# The builder pushes only work whose checks pass

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

The builder committed with the git hooks switched off, and a card at its
session limit stopped with a draft pull request. Unfinished, failing work
reached the code host, where it looked like work ready to look at. What may
the builder push?

## Considered Options

- Push everything, and mark unfinished work as a draft pull request.
- Push only work whose checks pass, through the repository's own git hooks,
  and keep unfinished work in the factory's copy.

## Decision Outcome

Chosen: only passing work is pushed. The factory runs the checks; once they
pass, it commits and pushes through the repository's git hooks, and what the
hooks refuse is fixed like a red check, in the same rounds. There are no
draft pull requests. Work that does not pass stays on the card's branch in
the factory's copy, and the card says what fails; Sprocket's `look_at_card`
reads it there.

### Consequences

- Good, because a pull request always passes its checks, and the hooks hold
  for the builder as for everyone.
- Bad, because unfinished work is only on the computer that ran the builder.

## More Information

`publishBranch` in `packages/server/src/extensions/factory/builder/branches.ts`;
[the Factory](../reference/features/factory.md). Prototype versions still
save without hooks: they are not work for the main branch.

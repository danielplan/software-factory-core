---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# Every factory's knowledge base keeps its shape

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

Every page of a factory's knowledge base was checked, but not the whole: a
factory could lack a section, and a lesson or a decision then had no home.
Kobble's own docs were loose pages that drifted from the code. How is the
knowledge base kept in shape and in step with the code?

## Considered Options

- Check each page only, and leave the shape to the people writing it.
- Check the shape too: the index and every section's index, before each pull
  request; put missing pages back at the upgrade; and hold Kobble's own
  `docs/` to the same shape.

## Decision Outcome

Chosen: the shape is checked. The knowledge base's checks fail when a page of
its shape is missing (`SKELETON` in `packages/knowledge-base/src/rules.ts`).
The builder runs them before each pull request, so a branch never leaves the
knowledge base broken or out of shape; the upgrade puts back the missing
pages, overwriting none. Kobble's own `docs/` has the same shape and is
checked as a knowledge base in `npm run check:docs`. The docs follow the
code: a branch that changes code and no docs fails, unless a commit says why
none need to change.

### Consequences

- Good, because every kind of fact has a home in every factory, and agents
  know where to look.
- Bad, because a small project starts with section pages that say "none
  yet".

## More Information

[The knowledge base](../reference/features/knowledge-base.md),
[maintaining the knowledge base](../how-to/maintain-the-knowledge-base.md).

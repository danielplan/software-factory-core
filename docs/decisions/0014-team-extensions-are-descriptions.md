---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# A team's own extensions are descriptions, never code

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

Teams want Kobble to do things only they need: a rule the builder always
follows, a page of their own, a stage in their way of working. The builder
writes these for them, and the team reviews the pull request, but the team
is not made of developers. How can a team extend its factory without code
that could break it or run something unknown?

## Considered Options

- A team's extension as code, like Kobble's own, loaded into the server and
  the page.
- A team's extension as a description: a file that says what it brings,
  drawn and run by Kobble's own code.

## Decision Outcome

Chosen: a description. A team's extension is
`factory/extensions/<id>/extension.json` with its guide files. It brings
pages and Home blocks of text and lists, drawn with Kobble's own components;
stages with named checks; guides for the builder or Sprocket; and settings.
It cannot start programs, be always needed, track work, fill a slot, or
reuse what another extension brings. Nothing loads without passing these
checks, one that fails is left out with a plain line, and the same checks
run before the builder's pull request.

### Consequences

- Good, because nothing unknown runs, and a team's extension cannot break the
  layout or the plugs.
- Good, because a team's page looks like Kobble's own.
- Bad, because a page that does something, or a kobold that runs, is not
  possible yet; it is asked of the core.

## More Information

[The Marketplace and extensions](../reference/features/marketplace-and-extensions.md#a-teams-own-extensions);
the builder's guide is `packages/skills/skills/factory/extensions.md`.

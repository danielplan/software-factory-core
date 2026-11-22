---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# The code host comes from the code slot

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

The builder, the card panel and Resolve called GitHub directly to find, open
and comment on pull requests. A company whose code lives elsewhere, GitLab
say, could not use the builder at all. Where does the builder get the place
its branches and pull requests go?

## Considered Options

- Keep GitHub in the builder, with a switch for each new host.
- Ask the `code` slot: the add-on that fills it gives a code host.

## Decision Outcome

Chosen: the `code` slot. `CodeHost` (`packages/server/src/code-host.ts`) is
what the builder needs from where the code lives; the add-on that fills the
slot gives it. GitHub's is the only one today. Another host comes later as
an add-on that fills `code`. With no code host for the filler, the builder
does not work the board, and says why.

### Consequences

- Good, because nothing in the builder, the card panel or Resolve names a
  host.
- Bad, because Releases and the feedback board still run the GitHub CLI
  directly; they move onto the slot when a second host comes.

## More Information

[Plugs and slots](../reference/plugs-and-slots.md#slots),
[add a code host](../how-to/add-a-code-host.md).

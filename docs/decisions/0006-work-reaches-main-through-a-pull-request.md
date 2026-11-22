---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# Work reaches main only through a pull request

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

A product's release notes, on the Releases page, are written from the pull
requests merged since the last release. Work pushed straight to main shipped
unlisted, and nobody reviewed whether its docs still held. How does work
reach the main branch?

## Considered Options

- Push to main when the checks pass.
- Commit on a branch, push it, open a pull request; never push to main.

## Decision Outcome

Chosen: only through a pull request, in this repository and, through the
`AGENTS.md` template, in every company's project. The builder opens one for
every card; people do the same for their own work.

### Consequences

- Good, because the release notes list everything that ships, and every
  change is reviewed.
- Bad, because a one-line fix also needs a branch and a pull request.

## More Information

[Releases](../reference/features/releases.md),
[the repository's rules](../reference/conventions/repository.md).

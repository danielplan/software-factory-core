---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# What the core owns, it overwrites; customizations go through a declared place

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

The core writes files and values into every factory: the git hooks, the
checks' scripts, the address a web app reaches its server at. When a team
edited one, the core used to leave it alone. Each factory then drifted its
own way: the same Kobble ran different checks in different companies, an
upgrade could not bring a fix to an edited file, and nobody could tell what
a factory really ran. How should the core treat what it owns once a team
has changed it?

## Considered Options

- Leave what a team edited alone, and write only what is untouched or
  missing.
- Overwrite what the core owns every time, the same way in every factory,
  and give a team a declared place of its own for what it wants
  differently.

## Decision Outcome

Chosen: overwrite, with a declared place. What the core owns it writes the
same way in every factory, at setup and at every
`software-factory upgrade`: `lefthook.yml` whole, the core's scripts in
`package.json` (`prepare`, `verify`, `check:docs`, `check:format`), lefthook
and the core's pin, and `BACKEND_URL` for a part that needs a backend. A
team's own hooks go in `factory/hooks.yml`, which `lefthook.yml` takes in
and the core never changes; its own scripts go under names of their own. A
different value where there is no such place yet waits for a declared
setting. What the core replaces is never lost silently: an old
`lefthook.yml` is kept in the factory folder and replaced scripts are named
with their old values for the owner, and `software-factory check` says when
a core-owned file was edited by hand.

### Consequences

- Good, because every factory on a release runs the same checks, and an
  upgrade brings fixes to all of them.
- Good, because what is the team's is in one place, visible in review.
- Bad, because a team's edit to a core-owned file is undone at the next
  upgrade; the check and the upgrade's lines say so, so it is moved to the
  team's own place.

## More Information

[Setup: the project files the core owns](../reference/features/setup.md#the-project-files-the-core-owns);
the code is `packages/server/src/project-files.ts`, with its 0.15.0
migration in `packages/server/src/upgrade/migrations.ts`.

---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# Both halves follow the React web app kit's layout

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

Kobble is built with its own kits, yet its page kept files in folders of its
own, and its server was one flat folder. Nothing showed which code belonged
to which extension, and nothing stopped one area importing another. How
should the two halves be laid out, and how is it kept?

## Considered Options

- Keep each half's own layout, and rely on review.
- Lay out both halves after the React web app kit (Bulletproof React):
  shared code, a folder per feature or extension, an app layer, checked by
  dependency-cruiser.

## Decision Outcome

Chosen: the kit's layout on both halves. The page has the kit's folders
(`app/`, `api/`, `components/`, `hooks/`, `lib/`, `features/<area>/`); the
server has its core modules, `extensions/<id>/` and `app/`. Code flows one
way, shared → features → app; a feature never imports another.
dependency-cruiser, the kit's tool, checks it in `npm run verify`
(`npm run check:borders:server`, `npm run check:borders:dashboard`). The
page follows the React web app kit's rules; the server, which no kit fits,
holds itself to the TypeScript package kit's rules where they apply.

### Consequences

- Good, because the layout matches the extensions, and the checks fail on a
  wrong import.
- Good, because Kobble is built the way it asks every product to be built.
- Bad, because the blueprints still list what differs from the kits, to be
  moved one card at a time.

## More Information

[One layout for both halves](../explanation/one-layout-for-both-halves.md);
the [server's](../../packages/server/BLUEPRINT.md) and the
[page's](../../packages/dashboard/BLUEPRINT.md) blueprints.

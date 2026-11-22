# Lessons from working on the core

[Knowledge base](../../index.md) · [Reference](../index.md) · [Lessons](index.md)

**Type:** Reference · Answers: which traps have we hit while changing Kobble's core, and what do we keep doing because of them?

- **Docs drift when work skips pull requests.** Work pushed straight to main
  shipped without a pull request, so the release notes missed it, and
  nobody asked whether the docs still held; a whole round was needed to
  bring them back in line with explorations, Sprocket, stuck cards and the
  code slot. Keep: work reaches main only through a pull request
  ([decision 0006](../../decisions/0006-work-reaches-main-through-a-pull-request.md)),
  and `npm run check:docs-follow` fails a branch that changes code and no
  docs.
- **A knowledge base loses its shape when nothing checks the shape.** Each
  page was checked, but a factory could lack a whole section, and the
  builder had nowhere to put a lesson or a decision. Keep: the shape is
  checked before every pull request and put back by the upgrade
  ([decision 0013](../../decisions/0013-knowledge-base-keeps-its-shape.md)).
  This repository's own `docs/` is checked the same way.
- **Paths in the docs go stale when code moves.** When the page took the
  kit's folders, pages still named the old ones. The docs check only sees a
  path written in backticks from a folder that exists, so a path such as
  `server/src/…` slips through. Keep: write paths from the repository's
  root (`packages/server/src/…`), so the check catches them.
- **A changelog file made every merge clash.** Every branch wrote at its top.
  Keep: what a company has to do is said in the commit message, and what the
  team reads is in the `WHATS-NEW` files, written at release.
- **A link in a guide can be read as a heading.** Sprocket's guide wrote the
  Marketplace's address as a Markdown link (`#extensions`), and the docs
  check looked for a heading with that name. Keep: addresses inside the page
  are written in backticks in guides.
- **One feature reaching into another ties them together.** The page's areas
  and the server's extensions imported each other, so none could be removed
  alone. Keep: shared → features → app, checked by dependency-cruiser on both
  halves ([decision 0012](../../decisions/0012-both-halves-follow-the-react-kit-layout.md)).

# Write a team's own extension

[Knowledge base](../index.md) · [How-to guides](index.md)

**Type:** How-to · Answers: how does a team get an extension of its own, and where is the guide the builder follows to write it?

A team's own extension is a description in the company's factory folder,
never code ([decision 0014](../decisions/0014-team-extensions-are-descriptions.md)).
What it can bring and what it cannot:
[the Marketplace and extensions](../reference/features/marketplace-and-extensions.md#a-teams-own-extensions).

## How a team gets one

1. Someone tells Sprocket what Kobble should do that it does not. Sprocket
   hands it on as an idea to explore; there is no button for it.
2. The team explores it with Doodle and hands it off as a card.
3. The builder writes it in `factory/extensions/<id>/`, following the
   factory skill's guide, `packages/skills/skills/factory/extensions.md`,
   starting from `packages/skills/skills/factory/extension-starter/` (a page,
   a Home block and a stage that load as they are).
4. The factory checks it on the builder's branch before the pull request, so
   a pull request never brings an extension that is then left out.
5. The team reviews and merges the pull request. The extension shows in the
   Marketplace under "Made by your team", to install like Kobble's own.

## Writing one by hand

The same guide holds for a person: copy the starter to
`factory/extensions/<id>/`, rename it, keep only what is needed, then start
the factory and see that it shows in the Marketplace. A mistake leaves the
extension out with a plain line among the factory's problems; it never stops
the others. What the factory refuses is listed in the guide.

## When it is not enough

A page that does something, a kobold that runs, or anything that needs code
is not a team's extension. It is a change asked of Kobble's core: see
[add one of Kobble's extensions](add-a-kobble-extension.md).

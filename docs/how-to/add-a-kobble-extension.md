# Add one of Kobble's extensions

[Knowledge base](../index.md) · [How-to guides](index.md)

**Type:** How-to · Answers: how do I add a new extension to Kobble itself, with its module, plugs, page, borders and tests?

This is for an extension that ships with Kobble, written in code. A
company's own extension is a description instead: see
[write a team's own extension](write-a-team-extension.md). Read
[extensions and plugs](../explanation/extensions-and-plugs.md) first.

## 1. Decide what it is

- Is it true for any company? Otherwise it is a company's own extension.
- What does it **bring** (pages, Home blocks, kobolds, stages), what does it
  **need**, and which **slots** does it use?
- Which records does it own, if any? Which plugs of others does it use, and
  what does it do when one is `null`?
- Does it offer something others need? Then it offers a plug.

## 2. The server module

1. Make `packages/server/src/extensions/<id>/index.ts`. Export `extension`,
   written with `defineExtension` from `@software-factory/core`, and
   `serve(host)`, which returns its routes, offers, Sprocket plug and
   background work. Copy the shape of a small one, such as
   `packages/server/src/extensions/releases/index.ts`. Each field:
   [the extension module](../reference/extension-module.md).
2. Its routes are `/api/kobble/<…>`, or `/api/add-ons/<id>/<…>` through
   `addOnRoutes` for an add-on.
3. Add the module to `KOBBLE_MODULES` (or the add-ons) in
   `packages/server/src/app/modules.ts`. Nothing else in the core changes.

## 3. Plugs

- **Uses another's plug:** `host.plug("ideas")`, and handle `null`: leave that
  part out, or say plainly that the other extension is not installed.
- **Offers a new plug:** write its type in `packages/server/src/plugs/<name>.ts`,
  add it to `Plugs` in `packages/server/src/plugs/index.ts`, and return it in
  `offers`. Add it to [plugs and slots](../reference/plugs-and-slots.md).
- **Has a kobold Sprocket hands to:** return `support`, a `SupportPlug`
  (`packages/server/src/kobble/support-plug.ts`) with its hand-offs, its pages
  and a paragraph about it, as each extension's `support.ts` does.
- **Has Home blocks:** offer `home` with its blocks' data, by block id.
- **Owns records:** add the collection and its owner to `OWNERS` in
  `packages/server/test/record-owners.test.ts`.

## 4. The page

1. Make `packages/dashboard/src/features/<id>/` with its page and any Home
   block. It imports only shared folders, never another feature.
2. Hand its page to the router and its blocks to Home in
   `packages/dashboard/src/app/` (`router.tsx`, `home-blocks.tsx`).
3. Put every word in a new area in `packages/dashboard/src/i18n/areas/`, in
   English, Italian and German: see [languages](../reference/languages.md).
4. Use the pieces in [the design system](../reference/design-system.md).

## 5. Borders and tests

1. Write the tests first, in `packages/server/test/` and
   `packages/dashboard/test/`, each one subject per file. Include one that
   runs it while another extension it uses is not installed.
2. Run `npm run check:borders:server` and `npm run check:borders:dashboard`:
   no extension imports another, no feature imports another.
3. A setting it needs goes in its declaration's `settings`; a change a
   company would make by hand gets a migration.

## 6. Docs and pull request

1. Add its feature page under `docs/reference/features/`, link it from the
   features index, and update [how Kobble is built](../explanation/how-kobble-is-built.md)
   and the server's [blueprint](../../packages/server/BLUEPRINT.md).
2. `npm run verify`, then a pull request. Its commit message says what a
   company sees and has to do, if anything.

# The server's conventions

[Knowledge base](../../index.md) · [Reference](../index.md) · [Conventions](index.md)

**Type:** Reference · Answers: how is code written in Kobble's server, and where are its rules?

The server (`packages/server/`) is "other code": no kit fits a local Node
server with its own HTTP routes. Its [blueprint](../../../packages/server/BLUEPRINT.md)
is the source for its promises, layout, import rules, libraries and what
still differs. Where they apply, it follows the TypeScript package kit's
rules (`packages/kits/rules/typescript-package/conventions.md`).

## Where code goes

| The code is…                                               | It goes in…                             |
| ---------------------------------------------------------- | --------------------------------------- |
| for one extension, Kobble's own or an add-on               | `packages/server/src/extensions/<id>/`  |
| what every factory has, whatever is installed              | a core module in `packages/server/src/` |
| a plug's type, offered by one extension and used by others | `packages/server/src/plugs/`            |
| putting the extensions together, the host, the HTTP server | `packages/server/src/app/`              |
| the `software-factory` command's start                     | `packages/server/bin/`                  |
| true for any server or package, read by companies too      | `packages/core/` (its published API)    |

## Rules

- **One way:** the core never imports `extensions/` or `app/`; an extension
  never imports another or the app. Checked by `npm run check:borders:server`
  (`.dependency-cruiser.cjs`).
- **Records:** only the owner of a collection names it in a store call
  (`packages/server/test/record-owners.test.ts`). Others use its plug and
  cope with `null`.
- **Routes:** an extension's routes are answered only while it is installed;
  a POST only from the factory's page. Route paths and the records' files do
  not change.
- **Strict TypeScript** with unchecked index access and no `any`; zod schemas
  are the source of the types; nothing happens on import; small files by
  subject (300 lines a file, 60 a function, by the lint).
- **A kobold's work** is Claude Code through the core's `Claude`; its tools
  are MCP servers (`packages/server/src/mcp.ts`), each checking its own token.

## Tests

The server's tests are in `packages/server/test/`, run with node's test
runner. A kobold is replaced by a stand-in (`pretend-claude.ts`), GitHub by
`pretend-github.ts`; an add-on that needs a stand-in exports a function that
makes its module.

## Lessons

[Lessons from the kobolds](../lessons/kobolds.md) and
[from working on the core](../lessons/working-on-the-core.md).

# The extension module

[Knowledge base](../index.md) · [Reference](index.md)

**Type:** Reference · Answers: what does one of Kobble's extensions consist of, field by field, on the server and on the page?

The type is `ExtensionModule` in `packages/server/src/plugs/extension.ts`;
the declaration's schema is `extensionSchema` in
`packages/core/src/extensions/extension.ts`. The app lists the modules in
`packages/server/src/app/modules.ts`.

## The folder

| Half   | Where                                               | What                                                                                   |
| ------ | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Server | `packages/server/src/extensions/<id>/`              | `index.ts`: `extension` and `serve(host)`                                              |
| Page   | `packages/dashboard/src/extensions/<id>/`           | `index.tsx`: its pages, Home blocks, settings sections and sidebar rows (`PageModule`) |
| Words  | `packages/dashboard/src/i18n/locales/`              | its name, line and every word it shows                                                 |
| Tests  | `packages/server/test/`, `packages/dashboard/test/` | its tests, one subject per file                                                        |

An add-on that needs a stand-in in the tests (the GitHub CLI, Jira's
fetch) exports a function that makes the module, such as `githubAddOn(cli)`.

## The declaration

| Field           | What it says                                                                        |
| --------------- | ----------------------------------------------------------------------------------- |
| `id`            | lowercase letters, digits and dashes; the folder's name                             |
| `name`, `about` | its name and one line, shown in the Marketplace                                     |
| `core`          | shipped with Kobble and on unless the company removes it                            |
| `always`        | can never be removed (only Factory)                                                 |
| `tracker`       | a place where work is tracked; it then fills `tasks`                                |
| `fills`         | the slots it fills (`code`)                                                         |
| `needs`         | other extensions it cannot work without, by id; never something to call             |
| `slots`         | the slots it uses (`code`, `tasks`)                                                 |
| `brings`        | its pages, Home blocks, kobolds and stages, by id                                   |
| `stages`        | its stages, each with the stages it comes `after` and `before`, and its `checks`    |
| `settings`      | its settings groups: a topic, its `.env` file, its fields                           |
| `guides`        | Markdown for a kobold (`builder`, `support` …), added to that kobold's instructions |
| `parts`         | programs the factory starts, watches and stops for it                               |

A team's own extension has the same declaration with `pages` and `blocks`
described as views, and fewer rights: see
[the Marketplace and extensions](features/marketplace-and-extensions.md).

## What `serve(host)` returns

| Field           | What                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes`        | its HTTP routes by `"METHOD /path"`: `/api/kobble/…` for Kobble's own, `/api/add-ons/<id>/…` for add-ons (`addOnRoutes`); a POST is answered only from the factory's page |
| `answers`       | requests it answers itself, before the routes: its kobolds' tools over MCP, the prototypes' world, a webhook                                                              |
| `offers`        | the [plugs](plugs-and-slots.md) it offers, and `home` for its blocks' data                                                                                                |
| `support`       | its plug into Sprocket, made again each time                                                                                                                              |
| `listen`        | told the server's address, for its kobolds' tools and webhooks                                                                                                            |
| `start`, `stop` | its background work: the live sync, missions to pick up, the builder's board work                                                                                         |

Beside `serve`, an add-on that fills a slot gives `codeHost` (for `code`)
or `tasks` (for `tasks`).

## The host

What `serve` gets (`Host`): `project` and `factory` (its folder), `claude`,
`cli` (the GitHub CLI), `store()` and `records()` (Kobble's records),
`changed(what)` and `stateChanged()` (tell the page), `isOn(id)`,
`plug(name)`, `slots` (the fillers of `code` and `tasks`), `cards()`,
`apps()`, `app(product)` and `browser()` for a kobold that looks at an app,
`available` (the extensions and kits Kobble ships), `watch` (the factory
opening and closing), `connect` (track work here from now on) and
`installTool(id)`.

## What the app does with it

`packages/server/src/app/assemble.ts` serves every module once the server
starts, and answers its routes, runs its work and hears its plugs only while
it is installed. Removing it in the Marketplace stops its work and takes all
of it away.

## The page's module

The page has the same shape: `packages/dashboard/src/extensions/<id>/index.tsx`
exports the extension's `PageModule` (`packages/dashboard/src/lib/page-module.ts`).

| Field      | What                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | the extension's id, as the server names it                                                                                             |
| `pages`    | its pages, each by its address (`#<id>`), with its sidebar row (group, icon, colour, what it counts) and whether it `fills` the window |
| `blocks`   | its Home blocks, by block id, drawn from what Home has read                                                                            |
| `settings` | its sections in Settings, each with its tab                                                                                            |

`packages/dashboard/src/app/extensions.ts` lists the modules and puts
together only the installed ones (the factory state's extensions that are
on): a removed extension's page code is not mounted at all.

# System

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: what does the System page show, and how are a product's parts started and stopped?

## What it does

System (`#system`) shows what the product is made of: its parts as a map,
each with its type (screen, backend, data or outside service), its light, and
**Start**, **Stop** and **Open**; and how they connect. The whole product
starts and stops at once too.

A **part** is a program the factory starts, watches and stops. A product's
kit makes the parts for each product of its kind (`partsFor`), from the
commands in its `product.json`, the product's own commands winning over the
kit's. The factory's own programs show in Settings, not on System.

A part that needs a backend (a part of type backend that answers on a
port, named in its `dependsOn`) is started with that backend's address in
`BACKEND_URL`, always, in every factory: a web app's development server sends
its `/api` requests there, so it reaches the server it depends on. A part's
settings may also name another part's port (`{port:<part>}`) or address
(`{address:<part>}`), filled in as it starts
(`packages/core/src/parts/addresses.ts`).

The launcher starts a part, waits until it answers, keeps its light, and
stops it. A part's problem is shown with its title in the team's language.

## Where it lives

| Part         | Where                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| The page     | `packages/dashboard/src/features/system/`                                                                            |
| The launcher | `packages/launcher/src/`                                                                                             |
| Parts        | `packages/core/src/parts/part.ts`                                                                                    |
| The routes   | `packages/server/src/app/server.ts`: `POST /api/parts/start`, `/stop`, `/restart`, `/api/start-all`, `/api/stop-all` |

## Checked and not checked

Checked by tests: the launcher and the parts, their addresses and
`BACKEND_URL` (`packages/launcher/test/`, `packages/core/test/parts.test.ts`),
the map's columns and lines (`packages/dashboard/test/system-map.test.ts`).

# Extensions and plugs

[Knowledge base](../index.md) · [Explanation](index.md)

**Type:** Explanation · Answers: how does an extension plug into Kobble, and how do extensions work together without knowing each other?

## One shape for every extension

Every extension of Kobble's, its own and the add-ons alike, is one module: a
folder `packages/server/src/extensions/<id>/` whose `index.ts` exports two
things.

- **Its declaration** (`extension`): the core's `Extension`, written with
  `defineExtension`. It says what the extension is (id, name, a line about
  it), what it brings, needs and uses (slots), the stages it adds, its
  settings and its guides for a kobold. The core reads it to put the factory
  together.
- **Its server part** (`serve(host)`): what it plugs in, returned once the
  server starts. Its routes, the requests it answers itself (its kobolds'
  tools, a webhook), the plugs it offers, its plug into Sprocket, and its
  background work (`start`, `stop`).

The app answers an extension's routes, runs its work and hears its plugs
**only while it is installed**. An add-on that fills a slot gives its filler
beside them: a code host for `code`, a board's cards for `tasks`. The shape is
`ExtensionModule` in `packages/server/src/plugs/extension.ts`; each part is
listed in [the extension module](../reference/extension-module.md).

## The host

`serve` gets a **host**: the core's side of the plug board, as one extension
sees it. It holds the project and its factory folder, Claude Code, the
records store, `changed(what)` to tell the page, `isOn(id)`, the slots'
fillers, `plug(name)` for another extension's offer, and a browser for the
kobolds that look at an app. The app builds it (`packages/server/src/app/host.ts`).

## Plugs

An extension uses another only through a **plug** that one offers:

- `ideas` (Explorations): take an idea, hear a signal, list explorations.
- `signals` (Signals): report signals, read them.
- `personas` and `missions` (Personas): the personas, and missions to start.
- `work` (Factory): the board's work, an answer on a stuck card.
- `home` (each with Home blocks): the data its blocks show.
- `support` (each with a kobold Sprocket hands to): its hand-offs.

`host.plug(name)` answers `null` while the extension that offers it is not
installed, and whoever uses a plug copes with that: it leaves that part out,
or says plainly that the other extension is not installed. Who offers and who
uses each plug, with its type's file: [plugs and slots](../reference/plugs-and-slots.md).

## Slots

A **slot** is a job the factory fills once for every extension: `code` (where
branches and pull requests go) and `tasks` (where work is tracked). Only
Kobble defines slots, and only Kobble's own extensions fill one. The team
fills each at setup; every extension that uses a slot uses that one filler,
and swapping it swaps it for all. The builder never names GitHub: it asks the
`code` slot for a code host ([decision 0009](../decisions/0009-code-host-from-the-code-slot.md)).

## Records

Kobble keeps its records as JSON files in the factory folder, through one
store (`KobbleStore`, `packages/core/src/kobble/store.ts`). Each collection
belongs to one extension, which alone reads and writes it:

| Collection     | Owner        |
| -------------- | ------------ |
| `signals`      | Signals      |
| `explorations` | Explorations |
| `personas`     | Personas     |
| `tests`        | Personas     |

Anyone else, the core or another extension, goes through the owner's plug. A
test checks it: `packages/server/test/record-owners.test.ts` fails on a store
call that names a collection outside its owner's folder.

## Why this shape

An extension can be removed by a team in the Marketplace. If one called
another directly, removing the second would break the first, or the first
would have to check everywhere. With plugs, the core is the only meeting
place, and `null` is the one case to handle. Sprocket shows it best: it used
to call the other kobolds' code itself; now each extension plugs its
hand-offs into Sprocket, so Sprocket hears only what is installed (see
[lessons from the kobolds](../reference/lessons/kobolds.md)).

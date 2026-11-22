# Plugs and slots

[Knowledge base](../index.md) · [Reference](index.md)

**Type:** Reference · Answers: which plugs and slots are there, who offers or fills each, who uses it, and where is its type?

Why there are plugs: [extensions and plugs](../explanation/extensions-and-plugs.md).
An extension reaches a plug with `host.plug(name)`, which is `null` while the
extension offering it is not installed; whoever uses it copes with `null`.

## Plugs

| Plug       | Offered by                                                                                         | Used by                                                                                                                | What it gives                                                                                                                  | Type                                         |
| ---------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `ideas`    | Explorations                                                                                       | Signals (Explore, the "already" check), setup, Personas (a mission on a prototype), the Factory's page                 | every exploration; take an idea; hear a signal; an exploration's address; a prototype's address; the cards explorations became | `packages/server/src/plugs/ideas.ts`         |
| `signals`  | Signals                                                                                            | Personas (a mission's findings), the feedback board, the Factory's page                                                | every signal, one by id; report new ones through the "already" check; change one                                               | `packages/server/src/plugs/signals.ts`       |
| `personas` | Personas                                                                                           | Explorations (who an idea is for, a world's situation), Signals (a persona's name and face), the feedback board, setup | every persona, one by id; add one                                                                                              | `packages/server/src/plugs/personas.ts`      |
| `missions` | Personas                                                                                           | Explorations (a prototype's tests), Signals (missions going on)                                                        | missions by id; those running now; start one, also on a prototype's branch                                                     | `packages/server/src/plugs/missions.ts`      |
| `work`     | Factory                                                                                            | the core (the page's state, updates), Explorations (the board's ideas), Signals (where a fix is)                       | the board's work as the builder last read it; an answer on a stuck card; read again; a card's column                           | `packages/server/src/plugs/work.ts`          |
| `home`     | each extension with Home blocks: Factory, Explorations, Signals                                    | Home, in the core (`GET /api/home`)                                                                                    | the data of its blocks, by block id                                                                                            | `packages/server/src/plugs/home.ts`          |
| `support`  | each extension with a kobold Sprocket hands to: Explorations, Personas, Signals, Factory, Releases | Sprocket, in the core                                                                                                  | its hand-offs (tools), the pages Sprocket may take people to, what Sprocket should know about it                               | `packages/server/src/kobble/support-plug.ts` |

The plugs one extension offers are listed together in
`packages/server/src/plugs/index.ts`; the app hears them through the plug
board (`packages/server/src/app/plug-board.ts`).

## Slots

| Slot    | What it is                          | Filled by                                                      | Used by                                                                                          | Type                                                                                                           |
| ------- | ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `code`  | where branches and pull requests go | GitHub (`fills: ["code"]`)                                     | Factory (the builder, the card panel, Resolve), Releases                                         | `CodeHost` in `packages/server/src/code-host.ts`                                                               |
| `tasks` | where work is tracked               | the company's tracker: GitHub board, or Jira (`tracker: true`) | Factory, Signals (Fix makes a card), Explorations (the hand-off card), Releases (its repository) | `Cards` in `packages/server/src/cards/cards.ts`, made by `TasksOf` in `packages/server/src/cards/cards-for.ts` |

Only Kobble defines slots (`SLOTS`) and only Kobble's own extensions fill
one; `packages/core/src/extensions/slots.ts` says who fills each and who is
in use. An installed extension that uses a slot nothing can fill stops the
factory, with the reason. In the Marketplace the slots show as connections:
**Your code** and **Your tasks**. Jira can be connected, but its cards are
not read yet.

## Records behind the plugs

| Collection     | Owner        | Reached by others through |
| -------------- | ------------ | ------------------------- |
| `signals`      | Signals      | `signals`                 |
| `explorations` | Explorations | `ideas`                   |
| `personas`     | Personas     | `personas`                |
| `tests`        | Personas     | `missions`                |

`packages/server/test/record-owners.test.ts` checks that no file outside the
owner's folder names its collection in a store call.

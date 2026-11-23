# Kobble's server blueprint

- **Kind:** other-code (see its `product.json`): no kit fits a local Node
  server with its own HTTP routes. Where they apply, it holds itself to the
  TypeScript package kit's rules
  (`packages/kits/rules/typescript-package/conventions.md`), and to the
  same shared → features → app layout as the page.
- **Promises:** it answers only requests addressed to this computer, and
  buttons only from its own page; the paths of its routes and the files of
  the records stay as they are; an extension removed takes away everything
  it plugged in, and nothing else breaks.
- **Checks:** the core's `npm run verify` at the top of the repository,
  with `npm run check:borders:server` (dependency-cruiser, its rules in
  `.dependency-cruiser.cjs` at the top) and `test/record-owners.test.ts`.

## Layout

| Part       | Where                                    | What                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core       | `src/`, outside `extensions/` and `app/` | what every factory has: the session and setup (`src/session.ts`, `src/coach/`), Kobble's records (`src/kobble/records.ts`), Sprocket (`src/kobble/support.ts`), updates, the feedback board, the plugs (`src/plugs/`) and the slots' types |
| Extensions | `src/extensions/<id>/`                   | one folder each: factory, explorations, signals, personas, releases, and the add-ons github and jira                                                                                                                                       |
| App        | `src/app/`                               | the assembly: the list of modules (`src/app/modules.ts`), the host each is served with, the plug board, the core's routes, the HTTP server                                                                                                 |
| Command    | `bin/`                                   | the software-factory command, which starts the server with the modules                                                                                                                                                                     |

An extension's `index.ts` gives its declaration (`extension`) and
`serve(host)`; an add-on that needs a stand-in in the tests (the GitHub
CLI, Jira's fetch) gives a function that makes the module. `serve` returns
what it plugs in (`src/plugs/extension.ts`): its routes, its own answers
(its kobolds' tools, a webhook), the plugs it offers, its Sprocket plug,
and its background work. The app answers an extension's routes, runs its
work and hears its plugs only while it is installed.

## Import rules

Checked by dependency-cruiser; code flows one way, core → extensions → app:

- the core never imports `src/extensions/` or `src/app/`;
- an extension imports the core (and the plugs' types), never another
  extension, never the app;
- only the app and `bin/` import the extensions.

The tests may import any of it, to check one piece alone.

## Plugs and records

| Plug       | Offered by    | Used by                                                                     |
| ---------- | ------------- | --------------------------------------------------------------------------- |
| `ideas`    | Explorations  | Signals (Explore, the "already" check), setup, Personas, the Factory's page |
| `signals`  | Signals       | Personas (a mission's findings), the feedback board, the Factory's page     |
| `personas` | Personas      | Explorations, Signals, the feedback board, setup                            |
| `missions` | Personas      | Explorations (a prototype's tests), Signals (missions going on)             |
| `work`     | Factory       | the session's state, updates, Explorations, Signals                         |
| `home`     | each with one | Home (`GET /api/home`)                                                      |
| `support`  | each with one | Sprocket                                                                    |
| `tasks`    | GitHub        | Factory, Signals (Fix), Explorations (hand-off), Releases                   |
| `code`     | GitHub        | Factory (the builder, the card panel), Releases, updates (Kobble's notes)   |

Each collection of records belongs to one extension, which alone reads and
writes it: `signals` to Signals, `explorations` to Explorations, `personas`
and `tests` to Personas. Everyone else goes through its plug and copes with
`null` (not installed).

## The TypeScript package kit's rules

- **Strict TypeScript,** with unchecked index access, and no any: the
  repository's `tsconfig.json` and typescript-eslint's strict, type-checked
  rules.
- **Schemas are the source of the types:** the records' schemas are the
  core package's (zod); a body the server keeps (a new persona, an
  exploration, a world's change) is parsed with zod.
- **Nothing happens on import:** `src/` only defines; `bin/` starts the
  server.
- **Small files by subject:** the lint's limits (300 lines a file, 60 a
  function).
- **One way in** does not apply: no other package imports the server,
  except the page's types (below).

## Libraries

| Job                              | Library                                               | Why                                                      |
| -------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Schemas and their types          | **zod** (`zod`)                                       | the TypeScript package kit's: one schema, check and type |
| The kobolds' tools               | **MCP SDK** (`@modelcontextprotocol/sdk`)             | the standard way Claude Code reaches tools               |
| A theme's colours and its CSS    | **culori** (`culori`), **PostCSS** (`postcss`)        | reading colours and contrast, and parsing CSS            |
| The core, kits and their checks  | the repository's own packages (`@software-factory/*`) | the factory's core, shared with every company            |
| A QR code for the page's address | **uqr** (`uqr`)                                       | small, no dependencies, draws the code as plain data     |

## Where it still differs

Each line is to be moved in line, one card at a time; nothing new is
added to it.

- **Routes:** written by hand on `node:http` (`src/app/server.ts`), each
  body read field by field (`src/asked.ts`), not a router with a zod
  schema for every body.
- **Types for the page:** the page imports some of the server's types by
  relative path (`packages/dashboard/src/api/client.ts` and a few
  features), not through a package export.
- **GitHub outside the slots:** the board's cards (`tasks`) and branches,
  pull requests and releases (`code`) come through the slots, but the
  GitHub CLI (`src/github-cli.ts`) is also run directly by the core's
  feedback board and by the Factory's webhook signals
  (`gh webhook forward`).
- **Records read in the core package:** the live sync (Signals) takes
  events in with the core's `takeInEvents`, which reads the personas and
  the explorations itself; the usage log (`src/kobble/logged-store.ts`)
  watches every change to an exploration.
- **The Factory's board work** follows the factory as soon as it is
  served, whether or not the Factory is installed (it always is, in a
  factory), so the page's state shows the board as the factory opens.

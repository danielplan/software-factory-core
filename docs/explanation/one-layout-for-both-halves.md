# One layout for both halves

[Knowledge base](../index.md) · [Explanation](index.md)

**Type:** Explanation · Answers: how are Kobble's server and page laid out, how is the layout checked, and which kit's standards does each part follow?

Kobble has two halves: the **server** (`packages/server/`), a Node program on
the team's computer, and the **page** (`packages/dashboard/`), the React app
in the browser. Both are laid out the way the React web app kit lays out any
product, after [Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md):
**shared** code, one **feature** folder per extension or area, and an **app**
layer that puts them together. Code flows one way, shared → features → app
([decision 0012](../decisions/0012-both-halves-follow-the-react-kit-layout.md)).

## The page

```text
packages/dashboard/src/
├─ main.tsx          the start: the company's theme, then the app
├─ app/              the shell, the pages by address, and the installed
│                    extensions' modules, put together (extensions.ts)
├─ api/              talking to the server
├─ components/       shared pieces: ui/ (shadcn), layout/ (the shell's)
├─ hooks/  lib/      general hooks and logic, shared by several areas;
│                    lib/page-module.ts is what an extension brings
├─ i18n/             the words, in English, Italian and German
├─ features/<area>/  one per core area (home, system, settings,
│                    marketplace, setup, support, updates, connect)
└─ extensions/<id>/  one per extension (factory, explorations, signals,
                     personas, releases); index.tsx exports its module
```

As on the server, each extension is a module: its `index.tsx` brings its
pages (by address, with their sidebar rows), its Home blocks and its
settings sections, and `app/` puts together only the installed ones, so a
removed extension's page code is not mounted at all. A feature never
imports another; the core never imports an extension, and an extension
never imports another or a core feature. What two share moves to a shared
folder.

## The server

```text
packages/server/src/
├─ <core modules>    shared: the session, setup, Sprocket, records, updates,
│                    the feedback board, the plugs, the slots, http, mcp …
├─ extensions/<id>/  one per extension: factory, explorations, signals,
│                    personas, releases, github, jira
└─ app/              the assembly: the list of modules, the host, the plug
                     board, the core's routes, the HTTP server
```

The core never imports `extensions/` or `app/`; an extension imports the core
and the plugs' types, never another extension; only `app/` and `bin/` import
the extensions.

## How it is checked

- **dependency-cruiser**, the kit's tool, checks the import rules in
  `npm run verify`: `npm run check:borders:server` with
  `.dependency-cruiser.cjs` at the top, and `npm run check:borders:dashboard`
  with `packages/dashboard/.dependency-cruiser.cjs`. The page's rules add the
  kit's own: no import cycles, no file nobody imports, `components/ui/` stays
  shadcn's, `lib/` has no screens, and only `app/` imports an extension.
- **The records test**, `packages/server/test/record-owners.test.ts`, checks
  that only the owner of a collection names it in a store call.
- **The libraries test**, `packages/kits/test/libraries.test.ts`, fails on a
  package that neither the kit's libraries table nor the blueprint names.

## Each part and its kit

- **The page** is a React web app. It follows
  `packages/kits/rules/react-web-app/` like any product a factory makes, and
  uses the library the kit names for each job. Its
  [blueprint](../../packages/dashboard/BLUEPRINT.md) lists what still differs
  from the kit.
- **The server** is "other code": no kit fits a local Node server with its
  own HTTP routes. Its [blueprint](../../packages/server/BLUEPRINT.md) holds
  it to the TypeScript package kit's rules where they apply (strict
  TypeScript, zod schemas as the source of the types, small files by
  subject, nothing happens on import) and to the same layout.
- **A team's own extension** is a description, so it has no code to hold to
  any rule.

## Not separated yet

The layout is in place; some parts still differ, and each list only shrinks.
The blueprints keep the lists; the main ones:

- The page writes its own word catalogue, routing on `location.hash` and
  fetching by hand, where the kit uses i18next, React Router and TanStack
  Query. It has no component tests yet.
- The server's routes are written by hand on `node:http`, each body read
  field by field, not a router with a zod schema per body.
- The page imports some of the server's types by relative path, not through
  a package export.
- The GitHub CLI is also run outside the slots: by the feedback board, by
  Releases and by the Factory's webhook signals.
- Two core pieces still read records themselves: the live sync's
  `takeInEvents` and the usage log.
- The Factory's board work starts as soon as the server does, installed or
  not; Factory is always installed, so it does not show.

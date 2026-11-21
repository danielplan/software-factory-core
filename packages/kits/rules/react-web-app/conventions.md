# How a React web app is built

The usual way for a web app made with React, TypeScript and Vite. A product
may do something its own way: then its own rule, written in its blueprint,
wins over this one.

## The libraries

One library per job. Use the one named here. A job this table does not
have is never written by hand: take what the platform gives first, then a
widely used, maintained library, and add its row, with why, in the same
change: in this kit when other products would need it too, in the
product's blueprint (`## Libraries`, the same table) when only it does. Code
of your own is allowed only as a row that says why no library fits. Every
package in the product's `dependencies` is named in one of the two tables;
the core's checks refuse one that is not.

| Job                               | Library                                                                                          | Why                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Screens                           | **React** with **TypeScript** on **Vite** (`react`, `react-dom`)                                 | the most widely known way to build screens                    |
| Components and styling            | **shadcn/ui** on **Tailwind** (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`) | accessible pieces, styled with the product's tokens           |
| Icons                             | **Lucide** (`lucide-react`)                                                                      | shadcn's own icons                                            |
| Logos of other products           | **Simple Icons** (`simple-icons`)                                                                | brand logos, kept up to date by others                        |
| Fonts                             | **Fontsource** (`@fontsource/*`, `@fontsource-variable/*`)                                       | fonts bundled with the app, no request to a font server       |
| Pages and addresses               | **React Router** (`react-router`, `react-router-dom`)                                            | addresses people can share, the back button, links            |
| Data from the server              | **TanStack Query** (`@tanstack/react-query`)                                                     | caching, refreshing, loading and error states                 |
| Live updates from the server      | the browser's **EventSource**, refreshing TanStack Query                                         | the platform has it                                           |
| Checking data from outside        | **zod** (`zod`)                                                                                  | one schema is both the check and the type                     |
| Forms                             | **react-hook-form** with zod (`react-hook-form`, `@hookform/resolvers`)                          | fields, errors and sending without hand-kept state            |
| Tables                            | **TanStack Table** (`@tanstack/react-table`)                                                     | sorting, filtering and paging                                 |
| Charts                            | **Recharts**, through shadcn's charts (`recharts`)                                               | shadcn's own charts                                           |
| Texts and languages               | **i18next** (`i18next`, `react-i18next`)                                                         | keys, plurals and languages, checked by eslint-plugin-i18next |
| Dates, numbers, money and sorting | the browser's **Intl**                                                                           | the platform has it                                           |
| Markdown                          | **react-markdown** with **remark-gfm** (`react-markdown`, `remark-gfm`)                          | Markdown as React elements, never as raw HTML                 |
| Diagrams written as text          | **Mermaid** (`mermaid`)                                                                          | flowcharts and sequences from text                            |
| Boxes and arrows people move      | **React Flow**, laid out by **ELK** (`@xyflow/react`, `elkjs`)                                   | panning, zoom and dragging; a layout without overlaps         |
| Pretend backend                   | **MSW** (development only)                                                                       | the same pretend server for tests and prototypes              |
| Tests                             | **Vitest**, **Testing Library**, **Playwright** (development only)                               | see How we test                                               |

## The folder layout

[Bulletproof React's project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md):
general code in shared folders, the code of one area of the app in that area's
feature folder, and an app folder that puts them together.

```text
src/
├─ app/                start-up, routes, providers; nothing imports it
├─ api/                everything that talks to the server: schemas, requests, query hooks
├─ components/
│  ├─ ui/              shadcn pieces, as generated
│  └─ layout/          the shell: navigation, page heading, loading and error states
├─ hooks/              general hooks
├─ lib/                general logic without screens
├─ features/<area>/    one folder per area: its components/, hooks/ and helpers
└─ theme.css           design tokens
```

Decide where a file goes by what it is (a component, a hook or plain logic)
and who uses it (one area or several). What several areas share never lives
in a feature folder. No barrel (index) files: import each file directly.

## The import rules

Code flows one way, shared folders → features → app, checked by
dependency-cruiser:

- the shared folders never import a feature or the app folder;
- a feature never imports another feature;
- only the entry file imports the app folder.

## The rules and why

- **One component per file.**
- **Presentation pieces hold no product rules;** features own their data and
  actions.
- **Check what the server answers** before showing it, with one zod schema per
  kind of record that is also the source of the types; a failed refresh shows
  as an error, never as an empty list.
- **Style with Tailwind classes on the element;** the theme file holds only
  fonts, tokens and global rules in `@layer base`.
- **No text written into a screen** when the app has translations: every word
  a person reads is a key in the translation files.
- **Errors from codes:** the server refuses with a code; the app shows its
  translation, and each form shows its errors at their inputs.

## The checks

All in the product's verify command; tighten them freely, loosen one only
with the owner's agreement. Inline lint-disabling comments are refused.

| Check                                                      | What it stops                                      |
| ---------------------------------------------------------- | -------------------------------------------------- |
| TypeScript strict, with unchecked index access             | unchecked undefined, missing returns               |
| ESLint strict type-checked, SonarJS, React hooks, jsx-a11y | unsafe types, bug patterns, inaccessible markup    |
| ESLint limits                                              | files over 300 lines, long functions, deep nesting |
| dependency-cruiser                                         | the import rules broken                            |
| knip, jscpd                                                | unused files and exports; copy-pasted code         |
| coverage floor (Vitest)                                    | code that loses its tests                          |

## How we test

- **Vitest** with **Testing Library** for components, with the server
  pretended by **MSW**.
- **Playwright** click-throughs against a pretend server for whole journeys.

## The starter

A new React web app starts as a copy of the kit's starter
(`starters/react-web-app` in the kits): one home page, a tiny API client, the
checks above in `npm run verify`, a `BLUEPRINT.md` and a prototype mode. Keep
to its folders and keep its checks.

## Prototype mode

The prototype is the real app in the browser against a pretend backend
(`prototype/`, served by MSW's service worker), with made-up data from the
situations in `prototype/situations.ts`, or from the factory's shared world
when the prototype starts with `FACTORY_WORLD_URL` (see the starter's
README). `npm run prototype` builds it, `npm run prototype:live` runs it.

- **No prototype code in the real app.** `src/` reaches `prototype/` only
  through the one dynamic `import()` in `src/main.tsx`, behind the
  `prototype` mode, so the real build drops it; MSW's worker lives outside
  `public/`. `npm run check:prototypes`, part of `npm run verify` after the
  build, fails when the real build names the prototype or holds the worker.
- **One pretend backend** for the tests and the prototype: a new request of
  the app gets its answer there, refusals included.
- Something a browser cannot do is faked in the prototype mode, never in the
  real app.

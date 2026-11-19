# How a React web app is built

The usual way for a web app made with React, TypeScript and Vite. A product
may do something its own way: then its own rule, written in its blueprint,
wins over this one.

## The tools

- **React**, **TypeScript** and **Vite**.
- **shadcn/ui** components on **Tailwind** before hand-built ones (tables,
  sidebars, sheets, charts).
- **React Router** for pages, **TanStack Query** for data from the server,
  **TanStack Table** for tables.
- **react-hook-form** with **zod** for forms.
- **i18next** for texts when the app speaks more than one language; the
  browser's **Intl** for dates, numbers, money and sorting.

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

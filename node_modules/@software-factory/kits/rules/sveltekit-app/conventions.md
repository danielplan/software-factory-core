# How a SvelteKit web app is built

The usual way for a web app made with SvelteKit, Svelte 5 and TypeScript. A
product may do something its own way: then its own rule, written in its
blueprint, wins over this one.

## The tools

- **SvelteKit** with **Svelte 5** (runes) and **TypeScript**, on **Vite**.
- **shadcn-svelte** components on **Tailwind** before hand-built ones
  (tables, sidebars, sheets, dialogs).
- **SvelteKit's own routing, load functions and form actions** for pages,
  data and forms; **zod** to check data from outside, with
  **Superforms** for larger forms.
- **Paraglide** or **i18next** for texts when the app speaks more than one
  language; the browser's **Intl** for dates, numbers, money and sorting.

## The folder layout

SvelteKit's own: routes by folder, shared code in the library folder.

```text
src/
├─ routes/             one folder per address: +page.svelte, +page.ts or
│                      +page.server.ts (its data), +layout, +server.ts (an endpoint)
├─ lib/
│  ├─ components/ui/   shadcn-svelte pieces, as generated
│  ├─ components/      the app's own components
│  ├─ server/          code that only runs on the server (secrets, the database)
│  └─ <area>/          the logic and components of one area of the app
├─ hooks.server.ts     what every request passes through (sign-in, logging)
└─ app.css             design tokens
```

Decide where a file goes by what it is and who uses it: a page's own pieces
next to its route, what several pages share in the library folder, and what
must never reach the browser in its server folder.

## Svelte's MCP server

The factory adds Svelte's own MCP server to the project (`svelte` in the
project's MCP settings). Use it:

1. **list-sections** first, to find the parts of the Svelte and SvelteKit
   documentation that matter for the task;
2. **get-documentation** for each of them, before writing code that uses
   them;
3. **svelte-autofixer** on every Svelte component you write or change, again
   until it reports no issues and no suggestions.

## The rules and why

- **Data comes from load functions,** so every page renders on the server
  and loads once: in the page's load (or the server load, for secrets and
  the database), with the fetch SvelteKit gives it. Never fetch at the top
  of a component while the server renders it.
- **Changes go through form actions or endpoints,** with the enhance action
  so a form works before and after the script loads; the page's data is
  then loaded again by itself.
- **Secrets stay on the server:** private settings only from SvelteKit's
  private environment modules, used only in server files.
- **Runes for state:** $state for what changes, $derived for what follows
  from it, $props for what comes in; $effect only to talk to the world
  outside (a chart library, the browser's storage), never to compute a value.
- **One component per file;** presentation pieces hold no product rules.
- **Style with Tailwind classes on the element;** the theme file holds only
  fonts, tokens and global rules in the base layer.
- **No text written into a screen** when the app has translations: every word
  a person reads is a key in the translation files.

## The checks

All in the product's verify command; tighten them freely, loosen one only
with the owner's agreement. Inline lint-disabling comments are refused.

| Check                           | What it stops                                      |
| ------------------------------- | -------------------------------------------------- |
| svelte-check, TypeScript strict | type errors in components and routes, unused names |
| ESLint with the Svelte plugin   | bug patterns, inaccessible markup, misused runes   |
| Prettier with the Svelte plugin | formatting arguments                               |
| coverage floor (Vitest)         | code that loses its tests                          |

## How we test

- **Vitest** for logic and load functions; **Testing Library** for Svelte
  components where a component holds behaviour.
- **Playwright** click-throughs against the running app for whole journeys,
  on a database of their own.

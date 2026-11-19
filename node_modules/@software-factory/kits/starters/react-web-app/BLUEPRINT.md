# Web app starter blueprint

The React web app kit's starter for a new web app. When the factory makes a new product of the kind `react-web-app`, it copies this whole folder (without `node_modules/`) into the product's folder, gives it the product's name (every `new-web-app` becomes the product's name in lowercase words with dashes) and installs its packages. The product's screens then grow from here, with made-up data in its prototype mode first, and every check below kept.

**Kind:** web app, following the kit's conventions (`rules/react-web-app/conventions.md` in the core's kits), trimmed to what an empty app needs.

## Structure

The folders follow [Bulletproof React's project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md): shared folders, one folder per area, and `app/` that puts them together. Code flows one way: shared folders → features → app.

```text
src/app/                          app.tsx: the top bar and the routes (the home page, loaded on demand); may import everything, nothing imports it
src/api/                          GET /api/items (load-items.ts), its zod schema (items.schema.ts), the query hook (use-items.ts), ApiError and the app's own error codes (api-error.ts)
src/components/ui/                shadcn pieces, as generated: button, card, empty, alert (trimmed of the parts nobody uses)
src/components/layout/            top bar, loading and error states
src/lib/                          general logic without screens: class names (classes.ts), error texts (error-text.ts)
src/i18n/                         i18next set-up, the translations (locales/<language>/<area>.json), Intl formats
src/features/home/                the one area: components/home-page.tsx, the item cards and the empty state
src/theme.css, public/            tokens, icon
test/                             component tests, the structure test, the translations test, the situations test, the shared world test
prototype/                        the one pretend backend (pretend-backend.ts, its MSW handler), the situations (situations.ts), the shared world (world.ts, shared-world.ts), start.ts (MSW's service worker, the message to the frame), reloads.ts (the factory's reload), public/mockServiceWorker.js (MSW's, generated)
scripts/                          build-prototype.ts (npm run prototype), live-prototype.ts (npm run prototype:live), check-real-build.ts (npm run check:prototypes)
```

**Prototype:** `npm run prototype -- --base <url path> --out <folder>` builds the app in Vite's `prototype` mode at that base; `npm run prototype:live -- --port <port>` runs it live. `src/main.tsx` holds the one switch: when the mode is `prototype` it loads `prototype/start.ts` with a dynamic `import()` and waits for MSW's service worker before rendering; the real build drops the branch. `?situation=<key>` picks a situation from `prototype/situations.ts` (the first by default); with `FACTORY_WORLD_URL` set, the factory's shared world is used instead. See the [README](README.md#prototype).

A new area is a folder in `src/features/`, its name in `.dependency-cruiser.cjs` (`areas`), a route in `src/app/app.tsx` and its texts in `src/i18n/locales/`. A new request is a function in `src/api/` with its zod schema, and its answer in `prototype/pretend-backend.ts`.

## Promises

- **The kit's standards:** React, TypeScript, Vite, shadcn on Tailwind with neutral tokens (the product's own colours and fonts replace them), TanStack Query, React Router, i18next, zod at the server boundary.
- **Truthful states:** loading, a failed load and an empty list are distinct; a failed load is never shown as an empty list.
- **No text written into screens:** every text a person reads is a key in the translation files (English to start with); ESLint refuses text in JSX, and the tests fail when a language misses a key, a plural form or an error code.
- **The real build has no prototype code:** no file of `prototype/`, no MSW and no `mockServiceWorker.js` in `dist/`; `src/` reaches `prototype/` only through the dynamic `import()` in `main.tsx`; `npm run check:prototypes` proves it after each build.
- **One pretend backend** (`prototype/pretend-backend.ts`) for the component tests and the prototype; every situation is typed against the app's own check of the answer and opens the home page.
- **The prototype tells the factory its situations:** `{ type: "factory-prototype", app: "new-web-app", situations: [{ key, name }], current, world }`, with at least a normal day and an empty one.
- **The checks below stay at least as strict as the starter's:** tighten them freely, loosen one only with the owner's agreement. No inline `eslint-disable`.

## Commands and checks

| Command | What it does |
|---|---|
| `npm run verify` | every check: Prettier; ESLint (`strictTypeChecked`, SonarJS, React hooks, jsx-a11y, no text written into JSX, no inline disabling; files up to 300 lines, functions up to 60 lines, 80 in `.tsx` files, complexity 12, nesting 3, no `console`) and dependency-cruiser (the import rules); TypeScript with `noUncheckedIndexedAccess`; knip; jscpd (at most 1% copied code); Vitest with Testing Library, the MSW pretend backend, the structure test, the translations test, the situations test and the coverage floor; the build; and `npm run check:prototypes` |
| `npm run dev` | the app in development, with `/api` sent to `BACKEND_URL` from `.env` when it is set |
| `npm run build` | the real build, in `dist/` |
| `npm run check:prototypes` | after the build: fails when `dist/` holds prototype code or MSW's worker |
| `npm run prototype -- --base <path> --out <folder>` | the prototype as static files, to be served at that path |
| `npm run prototype:live -- --port <port>` | the prototype running live on that port |

## Open

- **No backend yet:** `GET /api/items` (and `POST /api/items`, which no screen uses yet) is made up and answered only by the pretend backend. The product replaces it with its own requests and decides which backend answers them.
- **One language:** English only; a second language brings a language switch and the browser's language detection (see the README).
- **No click-through tests:** add Playwright journeys with the app's first journeys.
- **Not wired into the repository's tools:** the root setup and the git hooks of the repository it lands in do not know this folder until they are told.

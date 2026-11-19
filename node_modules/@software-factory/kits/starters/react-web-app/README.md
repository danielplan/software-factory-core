# New web app

The React web app kit's starter: React + TypeScript + Vite, shadcn on Tailwind, with the kit's standards and checks. It has one home page, a tiny API client and a prototype mode with a pretend backend. The factory copies it into a new product's folder and gives it the product's name ([BLUEPRINT](BLUEPRINT.md)).

## Run

Use Node.js 24.21 or newer. In this folder, run `npm ci`, then:

- `npm run dev` runs the app in development. Copy `.env.example` to `.env` and set `BACKEND_URL` once the app has a backend: Vite then sends `/api` to it. Without a backend, use the live prototype instead.
- `npm run build` makes the real build in `dist/`. Until the product decides where it is served, Vite's base is `/`.

## Structure

The folders follow [Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md); the [BLUEPRINT](BLUEPRINT.md) has the full tree.

- `src/app/app.tsx`: the top bar and the routes; each page loads on demand.
- `src/api/`: `load-items.ts` (GET `/api/items`), its zod schema (`items.schema.ts`), the query hook (`use-items.ts`) and `ApiError` (`api-error.ts`), the one error every request fails with.
- `src/features/home/`: the home page, its item cards and its empty state.
- `src/components/layout/`: the top bar, the loading and error states. `src/components/ui/`: shadcn's pieces; add one with `npx shadcn@latest add <name>`, then check that its imports use `@/lib/classes`.
- `src/i18n/`: i18next's set-up, the translations (`locales/<language>/<area>.json`) and the date format.
- `test/`: Vitest with Testing Library, with the pretend backend behind MSW (`test/pretend-server.ts`).
- `prototype/` and `scripts/`: the pretend backend, the situations, the shared world, the prototype's start, and the scripts that build it, run it live and check the real build.

To add an area: a folder in `src/features/`, its name in `.dependency-cruiser.cjs` (`areas`), a route in `src/app/app.tsx`, and its texts in every language.

## Texts and languages

The app speaks English. To add a text, add the key to the area's file in `src/i18n/locales/en/`, then use `t("key")`. ESLint refuses text written into JSX, and the tests fail when a language misses a key. To add a language: a folder in `src/i18n/locales/`, an entry in `src/i18n/resources.ts`, its name in `languages` (`src/i18n/i18n.ts`) and its locale in `src/i18n/format.ts`; then a language switch and the browser's language detection (`i18next-browser-languagedetector`).

## Checks

Run `npm run verify`: format, ESLint and import rules, types, unused code (knip), copied code (jscpd), the tests with the coverage floor, the build, and `npm run check:prototypes`. Single test: `npx vitest run test/home.test.tsx`.

## Prototype

A prototype is the real app running in the browser against the pretend backend, with made-up data, so an idea can be used before it is built. The factory shows it in a frame.

- `npm run prototype -- --base /prototype/new-web-app/ --out <folder>` builds it as static files in `<folder>` (emptied first), to be served at that path with `index.html` for unknown paths. The router follows Vite's `BASE_URL`, so the app works under any path.
- `npm run prototype:live -- --port <port>` runs it live (Vite's development server in `prototype` mode) at `http://127.0.0.1:<port>/`; each change shows within a second.
- `prototype/pretend-backend.ts` is the one pretend backend: the component tests and the prototype both use it, through the MSW handler in `prototype/pretend-handler.ts`. It answers `GET /api/items` and `POST /api/items`; a new request of the app gets its answer here.
- `prototype/situations.ts` lists the situations, in order: `{ key, name, data }`, typed against the app's own check of the answer (`src/api/items.schema.ts`). Today: "A normal day" (`normal`, the default) and "Empty" (`empty`). To add one, add an entry; `test/situations.test.tsx` opens the app in each.
- `?situation=<key>` picks a situation. Nothing is kept: a reload starts the situation again.
- On start, `prototype/start.ts` starts MSW's service worker (`prototype/public/mockServiceWorker.js`, written by `npx msw init prototype/public --save`) scoped to the base path, and tells the page around it `{ type: "factory-prototype", app: "new-web-app", situations: [{ key, name }], current, world }` with `postMessage`. The app renders only after that. When the factory posts `{ type: "factory-reload" }` after the prototype maker's change, the page loads again in place (`prototype/reloads.ts`).
- The real build has none of this: `src/main.tsx` loads `prototype/start.ts` with a dynamic `import()` only in `prototype` mode, the worker sits outside `public/`, and `npm run check:prototypes` fails if `dist/` names the prototype or holds the worker.

### Shared world

When the factory gives several devices (or several apps) one made-up world, it starts the prototype with `FACTORY_WORLD_URL` set; the prototype scripts hand it to the page as `VITE_FACTORY_WORLD_URL`. The pretend backend then uses that world instead of `prototype/situations.ts` (`prototype/world.ts`, `prototype/shared-world.ts`):

- `GET <url>` answers `{ situation, version, signed_in, tables }`; the app's items are `tables.items`, checked by the app as it checks the real backend.
- A change is `POST <url>` with `{ version, changes: [{ table, op: "add" | "change" | "remove", row }] }`. A stale version is refused with 409: the world is read again and the change tried again, a few times at most.
- Every 2 seconds the world is read again; when its version changed, the pretend backend takes the new tables and the screens load their data again, so every device sees the same world.
- The message to the factory says `world: true` and `current` is the world's situation.

Without `FACTORY_WORLD_URL` nothing changes: the situations decide.

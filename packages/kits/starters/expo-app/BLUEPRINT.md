# New phone app blueprint

The software factory's starter for a new Expo app: an empty app with one home screen, the kit's tools and checks, and a prototype mode. When a new Expo app is made, the factory copies this folder into the new product's folder, gives the package its name and installs its packages. The product then grows its own screens from here and keeps every check.

**Kind:** phone app, following the Expo kit's rules (`packages/kits/rules/expo-app/conventions.md` in the factory's core).

## Structure

Laid out by area:

- `src/app/` holds the routes only; each route file renders a screen from an area. The starter has one: `index.tsx`, the home screen.
- `src/features/<area>/` holds one folder per area, with its `components/` and `hooks/`; the starter has `home`. Every area is named in `.dependency-cruiser.cjs`.
- `src/api/` holds backend access: the address (`api-url.ts`), one request with its refusals as codes (`request.ts`, `api-error.ts`), zod schemas and TanStack Query hooks. The starter's one route, `GET /api/items`, is made up.
- `src/providers/` holds the app-wide providers above the router.
- `src/components/` holds shared pieces; `src/hooks/` and `src/lib/` shared hooks and logic; `src/i18n/` the translations (English to start with); `src/theme/` tokens, where colours are written only.
- A file named `name.web.ts(x)` is Expo's browser version of `name.ts(x)` next to it, for what a browser lacks; only the prototype runs in a browser.
- `prototype/` holds the prototype ([README](README.md#prototype)): the pretend backend, the situations, the link to a shared world and the start; `public/mockServiceWorker.js` is MSW's service worker for it. `scripts/prototype.ts`, `scripts/live-prototype.ts` and `scripts/prototype-phone.ts` build and start it.

## Promises

- **The checks stay at least this strict:** the lint rules (no `eslint-disable` comments), import rules, size limits and coverage floor. Tighten them freely; loosen them only with the owner's agreement.
- **Presentation components receive actions from callers** and never import workflows, providers or API code (checked by `.dependency-cruiser.cjs` and `test/rules/structure.test.ts`).
- **Light and dark; every text from the translation files.** The phone's language decides when the app speaks it (`test/rules/translations.test.ts`).
- **Refusals are codes:** the app translates codes; no backend sentence is shown as-is when the code is known.
- **Addresses come from `.env`.**
- **The real app contains no prototype code.** `src/` reaches `prototype/` only through the switch `src/lib/prototype-mode.ts` (checked by `.dependency-cruiser.cjs`), and a normal build leaves it out (checked by `npm run check:prototypes`).
- **The pretend backend has one source,** `prototype/pretend-backend.ts`, shared by the Jest tests and the prototype; every situation opens the app, and the page tells the factory its situations as `factory-prototype` with `app: "new-phone-app"` (`test/journeys/prototype.test.tsx`).
- **A shared world when the factory gives one:** with `FACTORY_WORLD_URL`, the pretend backend reads, writes and follows that world instead of a situation ([README](README.md#shared-world)).

## Commands and checks

- `npm run verify` — format, ESLint + import rules, types, knip, jscpd, Jest with coverage floor, a normal build without prototype code (`check:prototypes`), `expo install --check`, expo-doctor. `npm start` (Expo).
- `npm run prototype -- --base <url path> --out <folder>` — the prototype for the browser; `npm run prototype:live -- --port <port>` — it running live; `npm run prototype:phone` — the prototype in Expo Go.

## Open

- **Made up:** `GET` and `POST /api/items` and the items exist only in the pretend backend; a new app replaces them with its own routes.
- **Not in the starter:** sign-in, device tests (Maestro), a backend's own error codes in the translations, the app's identifiers for the stores (`ios.bundleIdentifier` and `android.package` in `app.json` are placeholders).
- **Not checked:** the prototype in Expo Go (`npm run prototype:phone`); the app on a real phone.

# New phone app

The software factory's starter for a new Expo app: Expo, Expo Router and TypeScript, with the Expo kit's tools and checks. It has one home screen that says it is the starting point and shows a made-up list of items from the backend. What must stay true is in [BLUEPRINT.md](BLUEPRINT.md).

When a new Expo app is made, the factory copies this folder (without `node_modules`) into the new product's folder, gives the package the product's name and runs `npm install`.

## Run

Use Node 24 and npm 11.

```sh
cp .env.example .env
npm ci
npm start
```

Open the project in Expo Go on a simulator or phone. On Windows, call `npm.cmd` instead of `npm` in PowerShell. Before publishing to the stores, set `ios.bundleIdentifier` and `android.package` in `app.json` (they are placeholders).

## Connect the backend

`.env` holds the backend's address:

- `EXPO_PUBLIC_API_URL`: one address for every platform, for example the computer's network address for a physical phone;
- `EXPO_PUBLIC_API_IOS_URL` and `EXPO_PUBLIC_API_ANDROID_URL`: the simulator and emulator addresses, used when the common one is empty.

Restart Expo after changing `.env`. Keep secrets out of `EXPO_PUBLIC_` variables: they are built into the app.

The starter asks the backend for one made-up route, `GET /api/items` (`src/api/queries.ts`, checked by `src/api/items.schema.ts`); only the pretend backend answers it. Replace it with the new app's own routes.

## Source layout

Laid out by area; see [BLUEPRINT.md](BLUEPRINT.md#structure). In short: `src/app/` routes, `src/features/<area>/` screens and their hooks, `src/api/` backend access, `src/providers/` app-wide providers, `src/components/` shared pieces, `src/hooks/` and `src/lib/` shared hooks and logic, `src/i18n/` translations, `src/theme/` tokens.

| Job              | Library                         |
| ---------------- | ------------------------------- |
| Routes           | Expo Router                     |
| Backend data     | TanStack Query                  |
| Checking answers | zod                             |
| Translations     | i18next, expo-localization      |
| Connection state | @react-native-community/netinfo |

## Texts and languages

The app speaks English to start with. Every text a person reads is a key in `src/i18n/locales/<language>/<area>.json`; ESLint refuses text written into screens. To add a language, add its folder in `src/i18n/locales/` with every file, its entry in `src/i18n/resources.ts` and its code in `languages` (`src/i18n/i18n.ts`); the translations test fails until it has every key.

## Prototype

A prototype is this app, with its real screens, running against a pretend backend with made-up data, so an idea can be tried before it is built. The factory shows it in a phone frame and makes it with these commands:

- `npm run prototype -- --base <url path> --out <folder>` builds the prototype for the browser as static files in `<folder>`, to be served at `<url path>` (for example `/prototypes/new-phone-app/v1`) with `index.html` for any other path. Open it at `<url path>/`; `?situation=<key>` picks a situation, and reloading starts it again.
- `npm run prototype:live -- --port <port>` runs the prototype live: Expo's web development server at `http://localhost:<port>/`, where each change shows within seconds.
- `npm run prototype:phone [-- --situation <key>]` starts Expo with the prototype for Expo Go on a phone or simulator. Expo's own options follow, for example `--ios` or `--port 8090`.

How it works:

- `prototype/pretend-backend.ts` is the pretend backend: the same one the Jest tests use (`test/pretend-backend.ts` runs it in Node). In the browser it is MSW's service worker (`public/mockServiceWorker.js`, kept current by `msw init`, see `msw.workerDirectory` in `package.json`); in Expo Go it is MSW for React Native, with the few browser parts MSW needs added by `prototype/polyfills.ts`.
- `prototype/situations.ts` lists the situations, the first is the default: a normal day with three made-up items (`normal-day`) and no items at all (`empty`). Add one for each case the new app's screens must show.
- `prototype/start.ts` starts it: picks the situation, fills the pretend backend, starts it, and tells the frame around the page which situations there are, with `window.parent.postMessage({ type: "factory-prototype", app: "new-phone-app", situations: [{ key, name }], current, world })`. It also reloads when the factory asks (`{ type: "factory-reload" }`) and tells the factory which screen it shows (`factory-screen`).
- The switch is `EXPO_PUBLIC_PROTOTYPE=1`, set only by the three commands. `src/lib/prototype-mode.ts` is the only way from `src/` into `prototype/`; Expo writes the setting into the app when it builds it, so a normal build leaves the prototype out (`npm run check:prototypes` builds the app and looks for prototype code in it).

## Shared world

The factory may give several prototypes one made-up world to share, so a change made on one device shows on the others. When `FACTORY_WORLD_URL` is set as a prototype command starts, the command hands it to the app as `EXPO_PUBLIC_FACTORY_WORLD_URL`, and the pretend backend uses that world instead of a situation (`prototype/world.ts`):

- it reads the world with `GET <url>`, which answers `{ situation, version, signed_in, tables }`; the items are `tables.items`, checked by the app's own schema when it reads them;
- it writes each change with `POST <url>` and `{ version, changes: [{ table, op: "add" | "change" | "remove", row }] }`; a `409` means the version was stale, so it reads the world again and retries (three tries at most);
- it looks at the world every two seconds and, when the version changed, takes its data and has the app read its answers again;
- the page's message says `world: true` and names the world's situation.

When the app gets a new kind of record, read its table in `prototype/start.ts` and write its changes from the pretend backend's route.

## Checks

- `npm run verify` runs every check and stops at the first failure: format, lint and import rules, types, unused code, copy-paste, Jest tests with coverage, a normal build without prototype code (`check:prototypes`), and Expo's dependency and configuration checks.
- The Jest tests in `test/journeys/` open the real app against the pretend backend (MSW, `prototype/pretend-backend.ts`, shared with the prototype); `test/journeys/prototype.test.tsx` opens the app in every situation of the prototype and checks what the page tells the factory; `test/unit/` and `test/rules/` hold the rest. The tests never read `.env`.
- A single test runs with `npx jest --runInBand test/journeys/<name>.test.tsx`.
- `npm run export:android` and `npm run export:ios` check that the app bundles; they do not replace a device check.

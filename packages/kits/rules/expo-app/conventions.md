# How an Expo app is built

The usual way for a phone app made with Expo, React Native and TypeScript. A
product may do something its own way: then its own rule, written in its
blueprint, wins over this one.

## The libraries

One library per job. Use the one named here. A job this table does not
have is never written by hand: take what the platform gives first, then a
widely used, maintained library, and add its row, with why, in the same
change: in this kit when other products would need it too, in the
product's blueprint (`## Libraries`, the same table) when only it does. Code
of your own is allowed only as a row that says why no library fits. Every
package in the product's `dependencies` is named in one of the two tables;
the core's checks refuse one that is not.

| Job                        | Library                                                                                                                                      | Why                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Screens                    | **Expo** and **React Native** with TypeScript (`expo`, `react`, `react-native`, `react-native-web`, `@expo/metro-runtime`)                   | one code base for iOS, Android and the web         |
| Device features            | Expo and React Native Community packages, added with `npx expo install` (`expo-*`, `@expo/*`, `react-native-*`, `@react-native-community/*`) | versions that match the Expo release               |
| Pages and addresses        | **Expo Router** (`expo-router`)                                                                                                              | file routes and deep links                         |
| Data from the server       | **TanStack Query** (`@tanstack/react-query`)                                                                                                 | caching, refreshing, loading and error states      |
| Checking data from outside | **zod** (`zod`)                                                                                                                              | one schema is both the check and the type          |
| Forms                      | **react-hook-form** with zod (`react-hook-form`, `@hookform/resolvers`)                                                                      | fields, errors and sending without hand-kept state |
| Texts and languages        | **i18next** with **expo-localization** (`i18next`, `react-i18next`, `expo-localization`)                                                     | keys, plurals and the phone's language             |
| Dates, numbers and money   | **Intl**                                                                                                                                     | the platform has it                                |
| Pretend backend            | **MSW** (development only)                                                                                                                   | the same pretend server for tests and prototypes   |
| Tests                      | **Jest** (jest-expo), **React Native Testing Library**, **Maestro** (development only)                                                       | see How we test                                    |

## The folder layout

The same shape as a React web app, with the folders Expo Router needs:

```text
src/
├─ app/                Expo Router route files only: each renders one screen from a feature
├─ api/                everything that talks to the server
├─ providers/          app-wide providers above the router
├─ components/         shared presentation, one component per file with its styles
├─ hooks/              general hooks
├─ lib/                general logic without screens
├─ theme/              tokens: colours (light and dark), sizes, type
└─ features/<area>/    one folder per area: its components/, hooks/ and helpers
test/                  Jest: journeys/ (the whole app against a pretend server), unit/
```

## The rules and why

- **One component per file, with its props and styles.**
- **Route files stay thin;** shared state sits in providers above the router,
  so work in progress survives navigation.
- **Shared components receive data and actions from their callers;** they
  never import an area.
- **Missing data shows an explicit state:** empty, unavailable, loading or
  error. A bad row is skipped, never allowed to blank a whole screen.
- **Colours only from the theme,** in a light and a dark palette; the look
  follows the phone.
- **Every control has a role and a label,** and a touch target of at least 44
  points.
- **Addresses come from the app's settings file;** restart Expo after
  changing it.

## The checks

The same as a React web app's, plus `expo install --check` and expo-doctor
(packages that do not match the Expo release, a broken project set-up).

## How we test

- **Journeys** render the real app against a pretend server served by MSW,
  sign in and use the screens as a person would. Clear the query client and
  use zero cache times, so Jest exits.
- **Device flows** with Maestro on a simulator, finding elements by test id
  or label, never by position.

## The starter

A new Expo app starts as a copy of the kit's starter (`starters/expo-app` in
the kits): one home screen, a tiny API client, the checks above in
`npm run verify`, a `BLUEPRINT.md` and a prototype mode. Keep to its folders
and keep its checks.

## Prototype mode

The prototype is the real app (in the browser, through Expo's web support)
against a pretend backend in `prototype/`, with made-up data from the
situations in `prototype/situations.ts`, or from the factory's shared world
when the prototype starts with `FACTORY_WORLD_URL` (see the starter's
README). `npm run prototype` builds it, `npm run prototype:live` runs it.

- **No prototype code in the real app.** The app reaches `prototype/` only
  through the one prototype switch, which a normal build leaves out.
  `npm run check:prototypes`, part of `npm run verify`, builds the app as a
  normal build does and fails when its JavaScript names the prototype or
  MSW.
- **One pretend backend** for the tests and the prototype.
- Something a phone can do and a browser cannot (background location, the
  camera) is faked in the prototype mode, never in the real app.

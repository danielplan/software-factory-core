# How an Expo app is built

The usual way for a phone app made with Expo, React Native and TypeScript. A
product may do something its own way: then its own rule, written in its
blueprint, wins over this one.

## The tools

- **Expo** and **React Native** with **Expo Router** file routes. Add Expo
  packages with `npx expo install`, so their versions match the Expo release.
- **TanStack Query** for server data, **zod** to check every answer,
  **react-hook-form** with zod for forms.
- **i18next** with expo-localization for texts when the app speaks more than
  one language; Intl for dates, numbers and money.
- Widely used Expo or React Native Community packages before anything
  hand-built.
- **Jest** (jest-expo) with React Native Testing Library and **MSW**;
  **Maestro** for taps on a real simulator.

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

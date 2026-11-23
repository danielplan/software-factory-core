# Languages

[Knowledge base](../index.md) · [Reference](index.md) · [Design system](design-system.md)

**Type:** Reference · Answers: how does every word Kobble's page shows come in English, Italian and German, and how is a word or a language added?

Every word Kobble's page shows is in English, Italian and German, the
screen-reader labels and tooltips too. The page uses the React web app
kit's library for it: **i18next** with **react-i18next**. The words are
JSON files, one per area of Kobble and language:
`packages/dashboard/src/i18n/locales/<language>/<area>.json` (the frame,
Home, System, Signals …), put together in one namespace by `resources.ts`,
so a key starts with its area: `shell.pages.home`. `messages.ts` sets
i18next up (bundled resources, ready before the first screen) and
`i18next.d.ts` types the keys, so a key that does not exist is a type
error.

A component gets the words with react-i18next's `useTranslation()`
(`const t = useTranslation().t`, then `t("home.about")`) and the language
with `useLocale()`, for times and dates (`format.ts`, through `Intl`). The
language is the owner's choice for this computer, or the browser's
(`use-t.tsx`, which also tells the server). Code outside components takes
`t` as an argument, English by default (`ENGLISH`), so its tests stay in
English.

## The checks

- **eslint-plugin-i18next** (`i18next/no-literal-string` in
  `eslint.config.mjs`) fails on any word written straight into a screen:
  JSX text, a string in JSX, or a `title`, `aria-label`, `placeholder`,
  `alt` or `label` written as a string; names such as Kobble or GitHub,
  addresses, paths and shortcuts aside.
- **`packages/dashboard/test/i18n.test.ts`** checks that every language has
  every key English has and no empty text, that a word that counts has
  every plural form its language needs (Italian has a third, `_many`), and
  that every language makes a word with the same names as English.

## Adding words

- **A new string**: add its key to the area's English file, then to Italian
  and German; the test names any language that lacks it. Words around a
  name or a number take it as `{{name}}`, never English grammar built in a
  component: `t("market.removeTitle", { name })`. A word that counts uses
  i18next's plurals (`newSignals_one`, `newSignals_other`, and for Italian
  `newSignals_many`) with `count`; a word with two forms that are not about
  a number uses a context (`merged`, `merged_since`, called with
  `context: "since"`). Keep the plain, short tone; the same thing has the
  same word everywhere (the pages' names in `shell`).
- **A new area**: write `locales/<language>/<area>.json` in the three
  languages and add them to `resources.ts`.
- **A new language**: add its code to `LOCALES` and its own name to
  `OWN_NAME` (`locale.ts`), its files under `locales/` and in
  `resources.ts`, and its name for the kobolds in
  `packages/core/src/agents/language-settings.ts`.
- **The server's words**: the server writes in English. The few the
  dashboard shows often (the launcher's problem titles, the updates' steps
  and reasons, a hand-off whose card is not on the board) are matched and said again in `server-texts.ts`; the rest
  stays English.
- **Not translated**: what people and kobolds write (signals, cards,
  explorations, answers), the names of products, add-ons and kits, and
  setting groups from the server.

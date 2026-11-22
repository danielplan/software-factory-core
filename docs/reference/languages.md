# Languages

[Knowledge base](../index.md) · [Reference](index.md) · [Design system](design-system.md)

**Type:** Reference · Answers: how does every word Kobble's page shows come in English, Italian and German, and how is a word or a language added?

Every word Kobble's page shows is in English, Italian and German, the
screen-reader labels and tooltips too. Today the words are in the page's own
typed catalogue, `packages/dashboard/src/i18n/`, one area per part of Kobble
(`areas/<area>.ts`: the frame, Home, System, Signals …). The React web app
kit uses i18next instead; moving to it is the first line of what still
differs in `packages/dashboard/BLUEPRINT.md`.

Each area is `area(en, it, de)` (`define.ts`): English is the source, and
Italian and German must have every key it has, with the same kind of value
(a text, or a function that makes one from what it names), or the types
refuse them. `packages/dashboard/test/i18n.test.ts` checks it again at run
time, and `packages/dashboard/test/words-in-catalogue.test.ts` fails on any
word written straight into a screen (JSX text, or a `title`, `aria-label`,
`placeholder`, `alt` or `label` written as a string), names such as Kobble
or GitHub, addresses and shortcuts aside.

A component gets the words with `useT()` (`use-t.tsx`) and the language with
`useLocale()`, for times and dates (`format.ts`, through `Intl`). Code
outside components takes the words as an argument, English by default, so
its tests stay in English.

## Adding words

- **A new string**: add its key to the area's English, then to Italian and
  German; the type check names any language that lacks it. Use a function
  for words around a name or a number (`newSignals: (n) => …`), never
  English grammar built in a component. Keep the plain, short tone; the
  same thing has the same word everywhere (the pages' names in `shell`).
- **A new area**: write `areas/<area>.ts` and add it to `AREAS` in
  `messages.ts`. When the three languages pass 300 lines, give each
  language its own file (as `setup.ts`, `setup-it.ts`, `setup-de.ts`,
  `setup-area.ts`).
- **A new language**: add its code to `LOCALES` and its own name to
  `OWN_NAME` (`locale.ts`), then a value for it in every `area(…)`, the
  types show where; and its name for the kobolds in
  `packages/core/src/agents/language-settings.ts`.
- **The server's words**: the server writes in English. The few the
  dashboard shows often (the launcher's problem titles, the updates' steps
  and reasons) are matched and said again in `server-texts.ts`; the rest
  stays English.
- **Not translated**: what people and kobolds write (signals, cards,
  explorations, answers), the names of products, add-ons and kits, and
  setting groups from the server.

## Why a catalogue of its own, for now

A few small typed objects give a type error for a missing word without a
library's type setup, and the page needs no plural rules beyond one and
many. It still differs from the kit, so it moves to i18next with its checks
when that card comes.

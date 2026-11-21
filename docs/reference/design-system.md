# Kobble's design system

**Type:** Reference · Answers: how does a page of the dashboard look, and which variables and pieces does it use?

Every page of the dashboard (Kobble) uses the same frame, type, colours and
pieces, so a new page looks like the others without new styles. The values
live in one place, `packages/dashboard/src/index.css`, as CSS variables, each
with its light value (the dashboard is light only for now). A company's theme (`factory/theme.css`,
see [the theme](../add-ons.md#the-theme)) may change the same variables.

## The frame

| Part      | What it is                                                                                                                                                                                                                                      | Where                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Ground    | The whole window, flat `--ground`. The sidebar sits on it.                                                                                                                                                                                      | `packages/dashboard/src/components/shell.tsx`     |
| Sidebar   | White, 256px wide, a line at its right, padding 22px 16px 16px: the kobold and "kobble", Home and System, then Signals, Explorations, Factory, then Personas, and at the bottom the update row (only when updates need the owner) and Settings. | `packages/dashboard/src/components/sidebar.tsx`   |
| Page      | On the ground beside the sidebar, at most 1120px wide, padding 34px 40px 60px (16px at the sides on a phone); an exploration fills the whole space.                                                                                             | `packages/dashboard/src/components/shell.tsx`     |
| Page head | The title (32px, bold, letter-spacing -0.025em) with the page's buttons on the right, and one line about the page (14px, `--muted-foreground`).                                                                                                 | `packages/dashboard/src/components/page-head.tsx` |

A page draws its title with `PageHead` and gives its buttons as `actions`;
they show on the right of the title. A button that belongs to one part of
the page stays in that part. Setting up (before there is a factory) keeps
its own layout, with the same variables and type.

On a phone the sidebar becomes a bar along the top whose menu opens the same
list, and the page fills the width.

## Kobble's pages

Every page looks the same. Cards are
white with radius 20px and `--shadow-card`; rows in a card have a line
(`--border-soft`) between them. Buttons are pills (`size="pill"`): dark for
the main one, white with a ring (`variant="ring"`) for the others. A picked
row is `--picked`; the current page in the sidebar `--wash` with
`--wash-foreground`. A signal's source is a round icon in its colour
(`--source-app`, `--source-usage`, `--source-errors`, `--source-test`) and
its type a tinted pill (`--type-bug`, `--type-request`, `--type-feedback`);
"Found in usage" is `--usage`.

A page with several sections that do not belong together (Settings) shows
them as tabs at the side, one at a time, each at its own address
(`#settings/updates`); on a phone the tabs wrap above it. The chosen tab is
white, like a card on the ground, with the chosen sidebar page's dark text
and its icon in colour; the others are plain grey text with a grey icon.

## Languages

Every word the dashboard shows is in one typed catalogue,
`packages/dashboard/src/i18n/`, an area per part of Kobble
(`areas/<area>.ts`: the frame, Home, System, Signals, …). Each area is
`area(en, it, de)` (`define.ts`): English is the source, and Italian and
German must have every key it has, with the same kind of value (a text, or
a function that makes one from what it names), or the types refuse them;
`test/i18n.test.ts` checks it again at run time. A component gets the words
with `useT()` (`use-t.tsx`) and the language with `useLocale()`, for times
and dates (`format.ts`, through `Intl`). Code outside components takes the
words as an argument, English by default, so its tests stay in English.

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
  `core/src/agents/language-settings.ts`.
- **The server's words**: the server writes in English. The few the
  dashboard shows often (the launcher's problem titles, the updates' steps
  and reasons) are matched and said again in `server-texts.ts`; the rest
  stays English.
- **Not translated**: what people and kobolds write (signals, cards,
  explorations, answers), the names of products, add-ons and kits, and
  setting groups from the server.

The catalogue is home-made, not a library such as i18next: a few small
typed objects give a type error for a missing word without a library's type
setup, and the dashboard needs no plural rules beyond one and many.

## Faces

The kobold and the personas are drawn as kobolds
(`packages/dashboard/src/components/kobold-face.tsx`): long ears, a round
head, two eyes, and a hat. Kobble's kobold is light blue with its blue
floppy cap. A persona has a hat (phones, toque, cap or beret) and a colour
(pink, amber, blue, teal, violet, green or slate), each a tile, a skin and a
hat colour; its file may say which (`face`), otherwise they come from its id
and never change. Someone no persona stands for is an empty grey tile.

## Type

Inter (bundled with the dashboard, so it works offline) for everything, and
Bricolage Grotesque for the name "kobble" beside the kobold (`font-display`).

| Use                  | Size | Weight | Colour               |
| -------------------- | ---- | ------ | -------------------- |
| Page title           | 26px | 700    | `--foreground`       |
| Kobble in the corner | 19px | 700    | `--foreground`       |
| Card title           | 14px | 600    | `--foreground`       |
| Text                 | 14px | 400    | `--foreground`       |
| Secondary text       | 13px | 400    | `--foreground-2`     |
| About a page or card | 14px | 400    | `--muted-foreground` |
| Small label          | 12px | 400    | `--label`            |
| Group in the sidebar | 11px | 600    | `--label`, uppercase |

## Colours

Text, from the strongest: `--foreground`, `--foreground-2`,
`--muted-foreground`, `--label`, `--faint`.

| Variable                                     | Light                                       | For                                                                   |
| -------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `--ground`, `--background`                   | #f5f6f8                                     | the window and Kobble's pages, columns on Build                       |
| `--panel`, `--card`, `--popover`             | #ffffff                                     | the panel, cards, menus                                               |
| `--page`                                     | #fafbfd                                     | the page body                                                         |
| `--primary`, `--primary-foreground`          | #141824, #ffffff                            | the main button of a place (dark)                                     |
| `--blue`, `--blue-foreground`                | #3156d8, #ffffff                            | the product's tile; sparingly, an action that changes the app         |
| `--tint`, `--tint-line`, `--tint-foreground` | #f3f5fc, #e1e6f7, #5b6074                   | the Ask field, the kobold's corner                                    |
| `--border`, `--line-soft`, `--border-soft`   | #e7e9ef, #e7e9ef, #f0f2f5                   | rings of the panel, buttons and fields; of cards; lines between parts |
| `--hover`                                    | #e9ebf3                                     | a page in the sidebar under the mouse                                 |
| `--understand`, `--explore`, `--build`       | #e64f86, #e9a23b, #2b5cff                   | each product page's icon                                              |
| `--persona-1` … `--persona-5`                | #fde7ef, #fff3df, #e9eeff, #e3f6f2, #f1ecff | each persona's soft colour, in order                                  |
| `--fresh`                                    | #e64f86                                     | the outline of something new                                          |
| `--success`, `--warning`, `--destructive`    | #12a594, #e9a23b, #d9534f                   | seen scenes and lights; starting; problems                            |

States, each a background and its text: new (`--open`), solved, a story
that didn't hold (`--wrong`), and the warm pair for an idea's ticket on
Build.

| State       | Variables                           | Light            |
| ----------- | ----------------------------------- | ---------------- |
| New, heard  | `--open`, `--open-foreground`       | #fde7ef, #a1214f |
| An idea     | `--solving`, `--solving-foreground` | #fff3df, #8a5300 |
| Solved      | `--solved`, `--solved-foreground`   | #e3f6f2, #0b6d61 |
| Didn't hold | `--wrong`, `--wrong-foreground`     | #f1f2f6, #5f6479 |

Text on the colours it sits on is readable (WCAG AA, 4.5:1), except
`--label` and `--faint`, which are only for short labels next to stronger
text.

## Light only

The dashboard is light only for now: `color-scheme: light`, no dark values,
and a company theme's rules for a computer set to dark are switched off in
the page's style sheets (`packages/dashboard/src/lib/light-only.ts`).

## Spacing and corners

| Piece               | Corner | Inside            |
| ------------------- | ------ | ----------------- |
| Card (`Card`)       | 20px   | 24px              |
| A thing on a board  | 14px   | 12px              |
| Button              | 10px   | 36px high, 0 14px |
| Small button        | 10px   | 30px high, 0 11px |
| Page in the sidebar | 9px    | 34px high, 0 10px |
| Pill                | round  | 24px high, 0 10px |

Parts of a page are 16px apart, cards in a list 8 to 14px.

## Shadows

| Variable           | For                                            |
| ------------------ | ---------------------------------------------- |
| `--shadow-soft`    | a card: a 1px ring in `--line-soft`, no shadow |
| `--shadow-lift`    | a card under the mouse                         |
| `--shadow-current` | the page open in the sidebar, the chosen tab   |
| `--shadow-card`    | a card: a 1px ring and a breath of shadow      |
| `--shadow-panel`   | the kobold's card                              |
| `--shadow-big`     | a dialog or a panel over the page              |

## Pieces

- **Buttons** (`packages/dashboard/src/components/ui/button.tsx`): `default` is dark, `outline` white
  with a ring, `blue` for an action that changes the app, `ghost` for a quiet
  one; `size="sm"` for a small one.
- **Cards** (`packages/dashboard/src/components/ui/card.tsx`): white, 20px corners, `--shadow-card`.
- **The kobold** (`KoboldHead` in `packages/dashboard/src/components/kobold-face.tsx`): wherever the
  kobold speaks or works, never a generic icon.
- **Tabs** inside a page: a grey track
  (`--surface-2`) with the chosen one white and lifted.

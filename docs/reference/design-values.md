# The design values

[Knowledge base](../index.md) · [Reference](index.md) · [Design system](design-system.md)

**Type:** Reference · Answers: which type sizes, colours, corners and shadows does Kobble's page use, and under which variable?

The values are CSS variables in `packages/dashboard/src/index.css`. How the
pieces use them is in [the design system](design-system.md).

## Type

Inter (bundled with the dashboard, so it works offline) for everything,
the name beside the kobold too (`--font-name`), unless the company's theme
gives its wordmark (`--wordmark`).

| Use                  | Size | Weight | Colour               |
| -------------------- | ---- | ------ | -------------------- |
| Page title           | 22px | 600    | `--foreground`       |
| Kobble in the corner | 21px | 700    | `--foreground`       |
| Card title           | 14px | 600    | `--foreground`       |
| Text                 | 14px | 400    | `--foreground`       |
| Secondary text       | 13px | 400    | `--foreground-2`     |
| About a page or card | 13px | 400    | `--muted-foreground` |
| Small label          | 12px | 400    | `--label`            |
| Group in the sidebar | 11px | 500    | `--sidebar-muted`    |

## Colours

Text, from the strongest: `--foreground`, `--foreground-2`,
`--muted-foreground`, `--label`, `--faint`.

| Variable                                     | Light                                       | For                                                                |
| -------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `--ground`, `--background`                   | #f7f7f8                                     | the window and Kobble's pages, columns on Build                    |
| `--sidebar`, `--sidebar-active`              | #fbfbfc, #ececef                            | the sidebar; the open page in it                                   |
| `--panel`, `--card`, `--popover`             | #ffffff                                     | the panel, cards, menus                                            |
| `--page`                                     | #fafbfd                                     | the page body                                                      |
| `--primary`, `--primary-foreground`          | #141824, #ffffff                            | the main button of a place (dark)                                  |
| `--blue`, `--blue-foreground`                | #3156d8, #ffffff                            | the product's tile; sparingly, an action that changes the app      |
| `--tint`, `--tint-line`, `--tint-foreground` | #f3f5fc, #e1e6f7, #5b6074                   | the Ask field, the kobold's corner                                 |
| `--border`, `--line-soft`, `--border-soft`   | #e6e6ea, #ececef, #f0f2f5                   | rings of the panel, buttons, fields and cards; lines between parts |
| `--hover`                                    | #efeff2                                     | a row under the mouse                                              |
| `--understand`, `--explore`, `--build`       | #e64f86, #e9a23b, #3156d8                   | the icons of Signals, Explorations, and Factory and Releases       |
| `--persona-1` … `--persona-5`                | #fde7ef, #fff3df, #e9eeff, #e3f6f2, #f1ecff | each persona's soft colour, in order                               |
| `--fresh`                                    | #e64f86                                     | the outline of something new                                       |
| `--success`, `--warning`, `--destructive`    | #12a594, #e9a23b, #d9534f                   | seen scenes and lights; starting; problems                         |

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
| Card (`Card`)       | 14px   | 24px              |
| A thing on a board  | 14px   | 12px              |
| Button              | 12px   | 32px high, 0 12px |
| Small button        | 10px   | 30px high, 0 11px |
| Page in the sidebar | 12px   | 32px high, 0 10px |
| Pill                | round  | 24px high, 0 10px |

Parts of a page are 16px apart, cards in a list 8 to 14px.

## Shadows

| Variable           | For                                            |
| ------------------ | ---------------------------------------------- |
| `--shadow-soft`    | a card: a 1px ring in `--line-soft`, no shadow |
| `--shadow-lift`    | a card under the mouse                         |
| `--shadow-current` | the page open in the sidebar, the chosen tab   |
| `--shadow-card`    | a card: a 1px ring in `--border`, no shadow    |
| `--shadow-panel`   | the kobold's card                              |
| `--shadow-big`     | a dialog or a panel over the page              |

# Kobble's design system

**Type:** Reference · Answers: how does a page of the dashboard look, and which variables and pieces does it use?

Every page of the dashboard (Kobble) uses the same frame, type, colours and
pieces, so a new page looks like the others without new styles. The values
live in one place, `packages/dashboard/src/index.css`, as CSS variables, each
with a light value and a dark one. A company's theme (`factory/theme.css`,
see [the theme](../add-ons.md#the-theme)) may change the same variables.

## The frame

| Part      | What it is                                                                                                                                                                                                                                        | Where                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Ground    | The whole window, flat `--ground`. The sidebar sits on it.                                                                                                                                                                                        | `packages/dashboard/src/components/shell.tsx`      |
| Sidebar   | White, 256px wide, a line at its right, padding 22px 16px 16px: the kobold and "kobble", the product switcher (only with several products), Signals, Explorations, Factory, then Personas, the kobold's card, and Settings and Workshop under it. | `packages/dashboard/src/components/sidebar.tsx`    |
| Panel     | The page's white panel (`--panel`), 8px from the window's edges, radius 16px, a 1px ring (`--shadow-panel`).                                                                                                                                      | `packages/dashboard/src/components/shell.tsx`      |
| Top bar   | At the top of the panel, at least 60px high, padding 10px 22px, a line under it (`--border-soft`): Ask the kobold at the left, the page's own buttons at the right.                                                                               | `packages/dashboard/src/components/ask-kobold.tsx` |
| Page body | Under the top bar, `--page`, padding 22px 30px 32px (16px at the sides on a phone), its parts 16px apart.                                                                                                                                         | `packages/dashboard/src/components/shell.tsx`      |
| Page head | The breadcrumb (on a page inside another), the title (26px, bold, letter-spacing -0.02em) and one line about the page (14px, `--muted-foreground`).                                                                                               | `packages/dashboard/src/components/page-head.tsx`  |

A page draws its title with `PageHead` and gives its buttons as `actions`;
they show in the top bar. A button that belongs to one part of the page stays
in that part. Setting up (before there is a factory), connecting a board and
prototype mode keep their own layout, with the same variables and type.

On a phone the sidebar becomes a bar along the top whose menu opens the same
list, and the panel fills the width.

## Kobble's pages

Signals and Personas sit right on the ground, without the panel: at most
1120px wide, padding 34px 40px 60px. Their header has the title (32px, 700,
letter-spacing -0.025em) and the page's buttons on the right. Cards are
white with radius 20px and `--shadow-card`; rows in a card have a line
(`--border-soft`) between them. Buttons are pills (`size="pill"`): dark for
the main one, white with a ring (`variant="ring"`) for the others. A picked
row is `--picked`; the current page in the sidebar `--wash` with
`--wash-foreground`. A signal's source is a round icon in its colour
(`--source-app`, `--source-usage`, `--source-errors`, `--source-test`) and
its type a tinted pill (`--type-bug`, `--type-request`, `--type-feedback`);
"Found in usage" is `--usage`.

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

Every variable has a dark value in the same file. Text on the colours it
sits on is readable (WCAG AA, 4.5:1) in both, except `--label` and `--faint`
in light, which are only for short labels next to stronger text.

## One question per page

Under a page's title, its one line says what to do there, as a question
when the page asks something of the person: Understand asks "What’s new to
look at?", a persona "Is this the real problem for Mia?", a story "Is this
how it happens? What is still guessed?". A story is told as a short
paragraph, one sentence per scene: the one where it breaks in `--open`, a
guessed one muted and in italics, a seen one with a small raised mark that
shows what was said, and where, on hover or focus.

## Stages

Where a problem, an idea or a ticket stands is its stage, one vocabulary
everywhere, worked out in the core (`derive`, `packages/core/src/records/stage.ts`)
and drawn by one stepper (`packages/dashboard/src/components/stage-steps.tsx`,
steps and colours in `packages/dashboard/src/lib/stages.ts`).

| Of        | Steps                                                              | Where                               |
| --------- | ------------------------------------------------------------------ | ----------------------------------- |
| A problem | Heard (or Assumed) → Trying ideas → Building → In the app → Solved | Understand: story cards, story page |
| An idea   | Idea → Versions → Picked → Building → In the app → Worked          | Explore: the list, the idea's page  |
| A ticket  | Building → In the app → Worked (the end of its idea's pipeline)    | Build: a card from an idea          |

Each ends in Didn't work instead, when that was the answer. Steps done are
dots in a calm teal (`--success` at 45%), the steps to come empty rings in
`--faint`, and the current one larger in its colour:

| Current step                             | Colour              |
| ---------------------------------------- | ------------------- |
| Heard, Assumed, Idea                     | `--foreground-2`    |
| Trying ideas, Versions, Picked, Building | `--explore` (amber) |
| In the app                               | `--build` (blue)    |
| Solved, Worked                           | `--success` (green) |
| Didn't work                              | `--fresh` (pink)    |

On a card it is the dots and the current stage's name (on Explore with the
number of versions beside it); on a page every step is named, with one plain
line of why under it ("In Build as #138", "B has the most picks", "Closed by
Luca on 14 Nov: it worked"). A story that didn't hold is crossed out and has
no stepper; a fix or an update on Build shows none, its column says enough.
Stages replace state pills in Understand and Explore.

## Light or dark

The dark values sit in `@media (prefers-color-scheme: dark)`. Settings has a
choice, Light or dark: System (the computer's setting, the first choice),
Light or Dark, kept in that browser. A choice turns those rules on or off in
the page's style sheets (`packages/dashboard/src/lib/theme-choice.ts`), the
company's theme included, so dark values are written once.

## Spacing and corners

| Piece                         | Corner | Inside            |
| ----------------------------- | ------ | ----------------- |
| Panel                         | 16px   | see the frame     |
| Section card (`Card`)         | 18px   | 24px              |
| Small card (a story, an idea) | 14px   | 12px 14px         |
| Button                        | 10px   | 36px high, 0 14px |
| Small button                  | 10px   | 30px high, 0 11px |
| Page in the sidebar           | 9px    | 34px high, 0 10px |
| Pill                          | round  | 24px high, 0 10px |

Parts of a page are 16px apart, cards in a list 8 to 14px.

## Shadows

| Variable           | For                                                |
| ------------------ | -------------------------------------------------- |
| `--shadow-soft`    | a card: a 1px ring in `--line-soft`, no shadow     |
| `--shadow-lift`    | a card under the mouse                             |
| `--shadow-current` | the page open in the sidebar, the chosen tab       |
| `--shadow-panel`   | the panel, the product switcher, the kobold's card |
| `--shadow-big`     | a dialog or a panel over the page                  |

## Pieces

- **Buttons** (`packages/dashboard/src/components/ui/button.tsx`): `default` is dark, `outline` white
  with a ring, `blue` for an action that changes the app, `ghost` for a quiet
  one; `size="sm"` for a small one.
- **Cards** (`packages/dashboard/src/components/ui/card.tsx`): white, 18px corners, the soft ring.
- **Pills** (`packages/dashboard/src/understand/bits.tsx`, `Pill`): 12px, 600, round, in a state's
  colours.
- **The kobold** (`KoboldMark`, the picture `packages/dashboard/public/kobold.png`): wherever the
  kobold speaks or works, never a generic icon.
- **Tabs** inside a page (Workshop, Light or dark): a grey track
  (`--surface-2`) with the chosen one white and lifted.
- **Ask the kobold**: ⌘K (Ctrl+K) goes to it, Enter asks; the answer opens
  under it, read from the records, with a button to close it.

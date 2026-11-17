# Kobble's design system

**Type:** Reference · Answers: how does a page of the dashboard look, and which variables and pieces does it use?

Every page of the dashboard (Kobble) uses the same frame, type, colours and
pieces, so a new page looks like the others without new styles. The values
live in one place, `packages/dashboard/src/index.css`, as CSS variables, each
with a light value and a dark one. A company's theme (`factory/theme.css`,
see [the theme](../add-ons.md#the-theme)) may change the same variables.

## The frame

| Part      | What it is                                                                                                                                                                                                                                        | Where                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Ground    | On a wide screen the window is a dotted canvas (`bg-dots`: `--canvas`, `--canvas-dot`), and the dashboard one big card on it, 12px from the edges, radius 22px, `--ground`, with `--shadow-float`. The sidebar sits on its ground.                | `packages/dashboard/src/components/shell.tsx`     |
| Sidebar   | 232px wide, padding 16px 12px: Kobble with the kobold; Home, Signals, Explorations, Factory, then Personas; at the bottom two small links (Product, Settings) and the "Your kobold" card, which opens the chat and says what the kobold is doing. | `packages/dashboard/src/components/sidebar.tsx`   |
| Panel     | The page's white panel (`--panel`), 8px from the window's edges, radius 16px, a 1px ring (`--shadow-panel`).                                                                                                                                      | `packages/dashboard/src/components/shell.tsx`     |
| Top bar   | Only on a page with buttons of its own: at the top of the panel, at least 60px high, padding 10px 22px, a line under it (`--border-soft`), the buttons at the right.                                                                              | `packages/dashboard/src/components/shell.tsx`     |
| Page body | Under the top bar, `--page`, padding 22px 30px 32px (16px at the sides on a phone), its parts 16px apart.                                                                                                                                         | `packages/dashboard/src/components/shell.tsx`     |
| Page head | The breadcrumb (on a page inside another), the title (26px, bold, letter-spacing -0.02em) and one line about the page (14px, `--muted-foreground`).                                                                                               | `packages/dashboard/src/components/page-head.tsx` |

A page draws its title with `PageHead` and gives its buttons as `actions`;
they show in the top bar. A button that belongs to one part of the page stays
in that part. Setting up (before there is a factory), connecting a board and
prototype mode keep their own layout, with the same variables and type.

On a phone the sidebar becomes a bar along the top whose menu opens the same
list, and the panel fills the width.

## Type

One font, Geist (bundled with the dashboard, so it works offline), at 400,
500, 600 and 700.

Each level has a name, a Tailwind class from `packages/dashboard/src/index.css`,
so the hierarchy reads the same on every page:

| Level   | Class          | Size | Weight | For                                |
| ------- | -------------- | ---- | ------ | ---------------------------------- |
| Title   | `text-title`   | 26px | 600    | a page's title                     |
| Section | `text-section` | 16px | 600    | a section's or a card's heading    |
| Item    | `text-item`    | 14px | 500    | the title of a row or a small card |
| Body    | `text-body`    | 14px | 400    | text                               |
| Note    | `text-note`    | 13px | 400    | a line under something, secondary  |
| Tag     | `text-tag`     | 12px | 500    | small labels next to stronger text |

## Colours

Text, from the strongest: `--foreground`, `--foreground-2`,
`--muted-foreground`, `--label`, `--faint`.

| Variable                                     | Light                                       | For                                                                   |
| -------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `--ground`, `--background`                   | #f3f4f6                                     | the window, the sidebar, columns on Build                             |
| `--panel`, `--card`, `--popover`             | #ffffff                                     | the panel, cards, menus                                               |
| `--page`                                     | #fafafb                                     | the page body                                                         |
| `--primary`, `--primary-foreground`          | #4f46e5, #ffffff                            | the main button of a place (indigo)                                   |
| `--blue`, `--blue-foreground`                | #4f46e5, #ffffff                            | sparingly, an action that changes the app                             |
| `--tint`, `--tint-line`, `--tint-foreground` | #eef2ff, #e0e7ff, #4338ca                   | the next step, the kobold's corner                                    |
| `--border`, `--line-soft`, `--border-soft`   | #e5e7eb, #eaecef, #f0f1f3                   | rings of the panel, buttons and fields; of cards; lines between parts |
| `--hover`                                    | #e9eaee                                     | a page in the sidebar under the mouse                                 |
| `--understand`, `--explore`, `--build`       | #0891b2, #d97706, #4f46e5                   | each product page's icon                                              |
| `--persona-1` … `--persona-5`                | #e0f2fe, #fef3c7, #ede9fe, #dcfce7, #ffe4e6 | each persona's soft colour, in order                                  |
| `--fresh`                                    | #e11d48                                     | the outline of something new                                          |
| `--success`, `--warning`, `--destructive`    | #16a34a, #d97706, #dc2626                   | seen scenes and lights; starting; problems                            |

States, each a background and its text: new (`--open`), solved, a story
that didn't hold (`--wrong`), and the warm pair for an idea's ticket on
Build.

| State       | Variables                           | Light            |
| ----------- | ----------------------------------- | ---------------- |
| New, heard  | `--open`, `--open-foreground`       | #ffe4e6, #9f1239 |
| An idea     | `--solving`, `--solving-foreground` | #fef3c7, #92400e |
| Solved      | `--solved`, `--solved-foreground`   | #dcfce7, #166534 |
| Didn't hold | `--wrong`, `--wrong-foreground`     | #f3f4f6, #4b5563 |

Every variable has a dark value in the same file. Text on the colours it
sits on is readable (WCAG AA, 4.5:1) in both, except `--label` and `--faint`
in light, which are only for short labels next to stronger text.

## One line per page

Under a page's title, one short line says what is there, or asks what the
page asks of the person: Understand "What goes wrong for the people who use
it.", a persona "Is this the real problem for Mia?", a story "How it
happens, step by step.". Personas is one list of people; Signals a list beside
the one shown. A story is a
timeline, one step per line: a check where it was seen (what was said, and
where, on hover or focus), a question mark and "guess" where it is guessed,
a cross on `--open` and "goes wrong" where it breaks, and what they do
instead last.

## Stages

Where a problem, an idea or a ticket stands is its stage, one vocabulary
everywhere, worked out in the core (`derive`, `packages/core/src/records/stage.ts`)
and drawn by one stepper (`packages/dashboard/src/components/stage-steps.tsx`,
steps and colours in `packages/dashboard/src/lib/stages.ts`).

| Of        | Steps                                                              | Where                                              |
| --------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| A problem | Heard (or Assumed) → Trying ideas → Building → In the app → Solved | Understand: the list, under a story                |
| An idea   | Idea → Versions → Picked → Building → In the app → Worked          | Explore: the list, and one line on the idea's page |
| A ticket  | Building → In the app → Worked (the end of its idea's pipeline)    | Build: a card from an idea                         |

Each ends in Didn't work instead, when that was the answer. Steps done are
dots in a calm teal (`--success` at 45%), the steps to come empty rings in
`--faint`, and the current one larger in its colour:

| Current step                             | Colour              |
| ---------------------------------------- | ------------------- |
| Heard, Assumed, Idea                     | `--foreground-2`    |
| Trying ideas, Versions, Picked, Building | `--explore` (amber) |
| In the app                               | `--build` (indigo)  |
| Solved, Worked                           | `--success` (green) |
| Didn't work                              | `--fresh` (rose)    |

On a card it is only the current stage: its dot and its name; on a page
every step is named (an idea's page shows one line instead, its stage and why, above its versions, each to try and vote for, then one row to send), with one plain
line of why under it ("In Build as #138", "B has the most votes", "Closed by
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

| Variable           | For                                            |
| ------------------ | ---------------------------------------------- |
| `--shadow-soft`    | a card: a 1px ring in `--line-soft`, no shadow |
| `--shadow-lift`    | a card under the mouse                         |
| `--shadow-current` | the page open in the sidebar, the chosen tab   |
| `--shadow-panel`   | the panel, the kobold's card                   |
| `--shadow-big`     | a dialog or a panel over the page              |

## Pieces

- **Buttons** (`packages/dashboard/src/components/ui/button.tsx`): `default` is indigo, `outline` white
  with a ring, `blue` for an action that changes the app, `ghost` for a quiet
  one; `size="sm"` for a small one.
- **Cards** (`packages/dashboard/src/components/ui/card.tsx`): white, 18px corners, the soft ring.
- **Pills** (`packages/dashboard/src/understand/bits.tsx`, `Pill`): 12px, 600, round, in a state's
  colours.
- **The kobold** (`KoboldMark`, drawn in SVG from `packages/dashboard/src/components/kobold-parts.tsx`; the tab's icon is `packages/dashboard/public/kobold.svg`): wherever the
  kobold speaks or works, never a generic icon. Each persona is a little
  kobold of the same family with a hat of its own (`PersonaMonster`).
- **Tabs** inside a page (Workshop, Light or dark): a grey track
  (`--surface-2`) with the chosen one white and lifted.
- **The chat** (`packages/dashboard/src/chat/`): empty, the kobold's own
  picture, big, fading in, over a big field in the middle; with the first message the field slides to the bottom and
  stays there. Bubbles: the person's at the right in `--primary`, the
  kobold's at the left on a card with its picture. Files attach with the
  paperclip, a drop or a paste, as chips above the text; while the kobold
  works, what is sent steers it, marked "Steer".
- **The river** on the Overview (`packages/dashboard/src/components/river.tsx`, `packages/dashboard/src/lib/river.ts`):
  one smooth band from Heard to Worked, as wide at each stage as what
  reached it, in `--river-heard`, `--river-ideas`, `--river-build`,
  `--river-done`; each stage's count and name above it. A glint runs down
  it, except with reduced motion.
- **The product map** (`packages/dashboard/src/product/`): a React Flow
  canvas on the dotted ground, read only; the project and the products as
  small cards joined by arrows, a card's details in a panel beside it.
- **Rows** (`packages/dashboard/src/components/row-list.tsx`, made by
  `packages/dashboard/src/lib/rows.ts`): every list of things, the same on
  the Overview and Understand: the title, for whom under it, where it
  stands as a dot in its colour and a word, and an arrow; "New" in
  `--open` on what nobody has looked at.

# The theme

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how does a company's factory take the look of its own app, and what may the theme change?

## What it does

The factory is a system of its own, next to the company's app: it should
feel related to the app, never be mistaken for it. The theme takes the app's
own colours, fonts and corners as they are (never shifting a brand colour),
and its logo beside the factory's name. The factory keeps its own face (its
kobolds, never the app's own mascot or assistant), its own layout and its
own name.

The page is built once and themed through CSS variables, the ones in
[the design values](../design-values.md). `factory/theme.css` changes them:
the server gives it to the page, which loads it after its own styles. It
sets the variables (colours, `--font-body`, `--radius`, shadows) and may use
the project's own files, such as its fonts, as
`url("/api/theme/file?path=<path inside the project>")`; only files the theme
names are given out. The page is light only for now, so a theme's rules for
dark are switched off. An upgrade never touches the theme.

When the factory is set up, the setup coach writes the theme from the
company's own app (its colour variables, its design guide, its fonts) and
copies the app's logo to `factory/logo.svg`, named as `--logo`, with the
app's wordmark (`--wordmark`), shown beside the project's name in the
sidebar.

## Rules that must hold

- The colours text sits on are set for light and dark as plain colours, and
  text is readable on them (WCAG AA).
- Every file the theme names is in the project.
- The components are never changed in a company: more than the theme allows
  is a change asked of the core.

## Where it lives

| Part       | Where                                      |
| ---------- | ------------------------------------------ |
| Serving it | `packages/server/src/theme.ts`             |
| Its checks | `packages/server/src/theme-check.ts`       |
| The logo   | `packages/dashboard/src/lib/brand.ts`      |
| Light only | `packages/dashboard/src/lib/light-only.ts` |

## Checked and not checked

Checked by tests: the theme and its checks (`theme.test.ts`,
`theme-check.test.ts`). Open: writing the theme again when the owner asks.

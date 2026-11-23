# Kobble's design system

[Knowledge base](../index.md) · [Reference](index.md)

**Type:** Reference · Answers: how does a page of Kobble look, and which pieces does it use?

Every page of Kobble uses the same frame, type, colours and pieces, so a new
page looks like the others without new styles. The values live in one place,
`packages/dashboard/src/index.css`, as CSS variables, each with its light
value; they are listed in [the design values](design-values.md). A company's
theme (`factory/theme.css`, see [the theme](features/theme.md)) may change
the same variables. Every word a page shows is in three languages: see
[languages](languages.md).

## The frame

| Part      | What it is                                                                                                                                                                                                                                                                                                                                                                   | Where                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Ground    | The whole window, flat `--ground`. The sidebar sits on it.                                                                                                                                                                                                                                                                                                                   | `packages/dashboard/src/components/layout/shell.tsx`     |
| Sidebar   | `--sidebar`, 224px wide, a line at its right, padding 16px 12px 12px: the kobold (or the company's logo) and the project's name, Home and System, then the work (Signals, Explorations, Factory, Releases), the customers (Personas) and the team's own pages, and at the bottom the update row (only when updates need the owner), Send feedback, Marketplace and Settings. | `packages/dashboard/src/components/layout/sidebar.tsx`   |
| Page      | On the ground beside the sidebar, at most 1120px wide, padding 34px 40px 112px (24px at the top and 16px at the sides on a phone); an exploration fills the whole space.                                                                                                                                                                                                     | `packages/dashboard/src/components/layout/shell.tsx`     |
| Page head | The title (22px, semibold, letter-spacing -0.015em) with the page's buttons on the right, and one line about the page (13px, `--muted-foreground`).                                                                                                                                                                                                                          | `packages/dashboard/src/components/layout/page-head.tsx` |

A page draws its title with `PageHead` and gives its buttons as `actions`;
they show on the right of the title. A button that belongs to one part of
the page stays in that part. Setting up (before there is a factory) sits in
the same frame: its steps are the sidebar's rows, each step a page with its
head, and Sprocket's bar at the bottom ([setup](features/setup.md)).

On a phone the sidebar becomes a bar along the top whose menu opens the same
list, and the page fills the width.

## Kobble's pages

Every page looks the same. Cards are
white with radius 14px and `--shadow-card`; rows in a card have a line
(`--border-soft`) between them. Buttons are pills (`size="pill"`): dark for
the main one, white with a ring (`variant="ring"`) for the others. A picked
row is `--picked`; the current page in the sidebar `--sidebar-active`, and
a count waiting there `--wash` with `--wash-foreground`. A signal's source is a round icon in its colour
(`--source-app`, `--source-usage`, `--source-errors`, `--source-test`) and
its type a tinted pill (`--type-bug`, `--type-request`, `--type-feedback`);
"Found in usage" is `--usage`.

A page that makes something with one click (Releases) puts the button at the
top right of its box, beside the title, with what it makes in its label
("Release 1.4.3"); while it works the button shows its spinner and cannot be
pressed again, and when there is nothing to make it is greyed out with the
reason beside it. A number the kobold suggests shows its reason next to it, in
grey, and a small **Change** link turns it into a field.

A page with several sections that do not belong together (Settings) shows
them as tabs at the side, one at a time, each at its own address
(`#settings/updates`); on a phone the tabs wrap above it. The chosen tab is
white, like a card on the ground, with the chosen sidebar page's dark text
and its icon in colour; the others are plain grey text with a grey icon.

## Pieces

- **Buttons** (`packages/dashboard/src/components/ui/button.tsx`): `default` is dark, `outline` white
  with a ring, `blue` for an action that changes the app, `ghost` for a quiet
  one; `size="sm"` for a small one. **Every button has an icon** before its
  words (from `lucide-react`, `aria-hidden`), the same icon for the same
  action everywhere: Play to start, Square to stop, RotateCw to restart,
  Send to send or hand off, Trash2 to delete, X to cancel, Plug to connect,
  Download to install or update, Check to save. A link button (`asChild`)
  puts its icon inside the link. While a button works, its spinner shows
  beside the icon.
- **A pull request's button** on a Factory card has the colour of its state:
  green when it is ready for review (`--success`, `--solved-foreground`),
  grey as a draft or closed (closed is struck through), purple once merged
  (`--merged`), red when it clashes with main (`--type-bug`), with
  **Resolve** under it.
- **Every state holds.** A piece shows each state it can be in without
  breaking: empty, loading or starting, running, stopped, a problem with its
  message, long names and long words (a folder's path wraps anywhere, inside
  its box), many items. Nothing spills out of its box or overlaps.
- **Cards** (`packages/dashboard/src/components/ui/card.tsx`): white, 14px corners, `--shadow-card`.
- **The kobold** (`KoboldHead` in `packages/dashboard/src/components/kobold-face.tsx`): wherever the
  kobold speaks or works, never a generic icon.
- **Tabs** inside a page: a grey track
  (`--surface-2`) with the chosen one white and lifted.

## Faces

The kobolds and the personas are drawn as kobolds
(`packages/dashboard/src/components/kobold-face.tsx`): long ears, a round
head, two eyes, and a hat. Each of Kobble's kobolds wears the hat of its job
(`packages/dashboard/src/lib/kobolds.ts`): Sprocket, the support kobold, its
blue floppy cap (it carries the factory's kobold name when the team gave
one); Doodle, the explorer, a beret; Tinker, Doodle's helper, a toque;
Bolt, the builder, a trucker cap; Mimic, the tester, a cap; Sieve, the
sorter, headphones. A persona has a hat (phones, toque, cap or beret) and a colour
(pink, amber, blue, teal, violet, green or slate), each a tile, a skin and a
hat colour; its file may say which (`face`), otherwise they come from its id
and never change. Someone no persona stands for is an empty grey tile.

A kobold's face stands free: no border, ring or tile, and hovering lifts it a
little (`face.tsx` in `components/meet/`); a click opens the "Your kobolds"
panel. Under a kobold's name, everything is in the secondary grey at the same
size, never in colour. A resting kobold is drawn asleep, eyes closed
(`asleep` on `KoboldHead`).

## Motion

Motion helps a person see what changed; it never makes them wait.

- **Quick and gentle:** 150–250 ms, an ease-out curve. Nothing bounces or
  loops without a reason.
- **What may move:** something opening or closing (a release in Settings ›
  Updates, a **More**), something coming in (changes fading in one after
  another, 40 ms apart, the first eight), a spinner while the product works
  (**Try again** while it checks), and a soft light on something that happens
  by itself ("Arriving by itself").
- **Nothing moves under `prefers-reduced-motion`:** `index.css` turns every
  animation off and shortens every transition, so each piece must read well
  standing still.

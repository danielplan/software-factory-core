# The add-ons: choosing the factory's parts

A company chooses which parts of the factory it uses. The kernel is always
there; every ability beyond it is an add-on, switched on or off in
`factory.json` and on the dashboard's Add-ons page. Built-in add-ons
(`core: true`) are on unless the company switches them off; the others are
off until it switches them on. An add-on says what it needs, and
`assembleFactory` refuses a factory where something it needs is missing.

This page lists the add-ons the core will ship, what each needs and adds,
how far each is here, and the order they come in. Most of them already run in
the first company's factory; they come here written for any company (see
[How companies update](architecture.md#how-companies-update)).

## The kernel (always there)

| Piece                                                                                                            | Here                          |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Loading products, extensions and kits; the company file; `assembleFactory`                                       | yes                           |
| Parts: start, watch and stop them; the System tab                                                                | yes                           |
| Settings groups and the Settings tab                                                                             | yes                           |
| Running Claude Code (kept open between turns), working copies                                                    | yes                           |
| The method (skills the agents follow) and the knowledge base with its checks                                     | yes                           |
| The setup coach on a map; Build and Open the factory                                                             | yes                           |
| The Add-ons page                                                                                                 | yes                           |
| **The theme**: the dashboard takes the look of the company's own app (see below)                                 | to come                       |
| **Install, add, remove and upgrade** from the command line, on a branch of its own                               | to come                       |
| **Extension points for tabs, agent tools and workflow steps**, so the add-ons below plug in like GitHub and Jira | to come, needed first         |
| **A working copy's own environment** (its own ports and database), asked of the product or its kit               | to come, needed by the runner |

## The add-ons

| Add-on             | What it does                                                                                                                                                  | Needs                                 | Built in | Here                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------- | ------------------------- |
| **Board**          | The work in its stages (draft, Backlog, Planning, To do, In progress, Review, Done); the factory's own board when no tracker is connected                     | –                                     | yes      | partly                    |
| **GitHub**         | Where work is tracked: a GitHub board, connected through the GitHub CLI                                                                                       | Board                                 | yes      | yes                       |
| **Jira**           | Where work is tracked: Jira Cloud with an API token                                                                                                           | Board                                 | yes      | yes                       |
| **Runner**         | Works the cards: talks a card's plan through, builds it test-first in a working copy of its own, runs the checks, opens a pull request, fixes review comments | Board, a tracker, GitHub as code host | yes      | to come                   |
| **Ideas**          | The owner starts an idea with a sentence and works it out with the idea coach on a map; Ready puts the agreed plan on the Backlog                             | Board                                 | yes      | partly                    |
| **Prototypes**     | The coach has a clickable prototype of an idea made in the real app, version by version, before anything is built                                             | Ideas, a kit with prototype mode      | no       | to come                   |
| **Made-up worlds** | Shared made-up data the prototypes run on, kept in step with the real data's shape; the coach can look at it and change it                                    | Prototypes                            | no       | to come                   |
| **Voice**          | The owner talks instead of typing; speech stays on the computer (a one-time download of about 0.8 GB)                                                         | –                                     | no       | yes (in the kernel today) |
| **Usage log**      | A record of how the factory is used, for a study: every change to an idea, each prototype version with a picture; on that computer only                       | Ideas                                 | no       | to come                   |
| **Updates**        | Tells the owner when a newer version of the project is ready and installs it on their computer, without git                                                   | –                                     | no       | to come                   |
| **Desktop start**  | A shortcut that starts the factory and the products, for owners who do not use a terminal                                                                     | –                                     | no       | to come                   |

### What each brings

- **Board**: the Board tab; Planning, where a card that did not come through
  Ideas has its plan talked through in its conversation until it is agreed;
  moving cards by dragging them (Backlog, Planning, To do) or
  with a menu; a card in Review opens its pull request.
- **GitHub**: connecting; signals from GitHub as they happen (`gh webhook
forward`, no public address needed) and a check every few minutes for
  anything missed; a hidden mark on the factory's own comments, because the
  owner and the factory may post with the same account.
- **Runner**: a part that starts from the System tab, or by itself if the
  owner switches that on. Two lanes: a chat lane that answers a card's
  conversation in a read-only copy, and a build lane that builds one card at a
  time in a copy with its own ports and database. Rules: a card without an
  agreed plan goes back to planning with a reason; the factory asks in the
  card when it needs a decision; a build that failed for a technical reason
  keeps its plan and is tried again when the card goes back to To do; the
  factory never merges. Its guide (how to talk in a tracker's threads) joins
  the method.
- **Ideas**: the Ideas tab and the idea coach's guide; choice cards for real
  choices with the coach's recommendation and the trade-offs, said early; an
  Agreed switch; pictures the owner pastes; parking, dropping and drafts; a
  short summary of the product in the coach's first prompt; the plan written
  as a card when the owner presses Ready.
- **Prototypes**: the prototype maker's guide; a conversation kept open per
  idea with the apps running live; each version kept, opening on the screen
  the idea is about; the coach makes small changes itself; a check that no
  prototype code reaches the real app. It asks each kit for its prototype
  mode and its starter, so a brand-new app starts from the kit's starter.
- **Voice**: Talk; live words while the owner speaks; a first draft as soon
  as they go quiet; the answer read out as it is written; "stop" interrupts.

## The kits

| Kit                                                        | Here | To come                                                                                                                                                             |
| ---------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React web app, SvelteKit web app, NestJS backend, Expo app | yes  | a starter with the kit's standards and checks (not only the framework's own), prototype mode, a working copy's environment, the checks to run before a pull request |
| Other code                                                 | yes  | –                                                                                                                                                                   |

## What stays with a company

Its products and their code, its own rules and decisions (for example, one
database server for all its products), its made-up data, its words. A rule
from a company that would hold for any company comes here as a lesson, in
general terms.

## The theme

The factory is a system of its own, next to the company's app: it should feel
related to the app, never be mistaken for it. The theme takes the app's own
colours, fonts and corners as they are (never shifting a brand colour), and
the logo beside the factory's name. The factory keeps its own face (the orb the coaches speak through, never
the app's own mascot or assistant), its own layout and its own name.

The dashboard is built once and themed through CSS variables, so a company
changes its look without changing the core. Its own look is calm: a light
neutral ground, white cards with a hairline and one accent colour.
`factory/theme.css` changes it: the server gives it to the dashboard, which
loads it after its own styles (`packages/server/src/theme.ts`). It sets the
variables for light and dark (colours, `--font-body`, `--radius`, shadows)
and may use the project's own files, such as its fonts, as
`url("/api/theme/file?path=<path inside the project>")`; only files the theme
names are given out. An upgrade never touches it.

When the factory is built, the setup coach writes the theme from the
company's own app (its colour variables, its design guide, its fonts), and
the factory's checks look at it (`packages/server/src/theme-check.ts`): the
colours text sits on are set for light and dark as plain colours, text is
readable on them (WCAG AA), and every file it names is in the project. To
come: writing it again when the owner asks, and the logo beside the
factory's name. The components themselves are never changed in a company:
more than the theme allows is a change asked of the core.

## The order

1. **The kernel's missing pieces**: install, add, remove and upgrade; the
   extension points for tabs, agent tools and workflow steps; a working
   copy's own environment. Then a first release.
2. **The theme**: written again when the owner asks; the logo.
3. **Runner**, with the Board's dragging and GitHub's signals; Jira after.
4. **Ideas**, the rest of it.
5. **Prototypes**, with the kits' starters and prototype mode; then
   **Made-up worlds**.
6. **Voice** as an add-on of its own, with live words and quick drafts.
7. **Usage log**, **Updates**, **Desktop start**.

Each step is a release, tried on the example company first.

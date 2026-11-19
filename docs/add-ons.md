# The add-ons: choosing the factory's parts

A company chooses which parts of the factory it uses. The kernel is always
there; every ability beyond it is an add-on, switched on or off in
`factory.json` and in the dashboard's Settings (Add-ons). Built-in add-ons
(`core: true`) are on unless the company switches them off; the others are
off until it switches them on. An add-on says what it needs, and
`assembleFactory` refuses a factory where something it needs is missing.

This page lists the add-ons the core will ship, what each needs and adds,
how far each is here, and the order they come in. Most of them already run in
the first company's factory; they come here written for any company (see
[How companies update](architecture.md#how-companies-update)).

## The kernel (always there)

| Piece                                                                                                             | Here                  |
| ----------------------------------------------------------------------------------------------------------------- | --------------------- |
| Loading products, extensions and kits; the company file; `assembleFactory`                                        | yes                   |
| Parts: start, watch and stop them; the product's parts on System, the factory's in Settings                       | yes                   |
| Settings groups and the Settings page                                                                             | yes                   |
| Running Claude Code (kept open between turns), working copies                                                     | yes                   |
| The skills the agents follow and the knowledge base with its checks                                               | yes                   |
| The setup coach on a map; Build and Open the factory                                                              | yes                   |
| The add-ons in Settings                                                                                           | yes                   |
| **The theme**: the dashboard takes the look of the company's own app (see below)                                  | to come               |
| **Install, add, remove and upgrade** from the command line, on a branch of its own                                | to come               |
| **Extension points for pages, agent tools and workflow steps**, so the add-ons below plug in like GitHub and Jira | to come, needed first |
| **A working copy's own environment** (its own ports and database), asked of the product or its kit                | yes (`copyEnv`)       |

## The add-ons

| Add-on             | What it does                                                                                                                                                                                        | Needs                                 | Built in | Here                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------- | ----------------------------- |
| **Board**          | The work in its stages (Backlog, To do, In progress, Review, Done), on the connected board                                                                                                          | –                                     | yes      | partly                        |
| **GitHub**         | Where work is tracked: a GitHub board, connected through the GitHub CLI                                                                                                                             | Board                                 | yes      | yes                           |
| **Jira**           | Where work is tracked: Jira Cloud with an API token                                                                                                                                                 | Board                                 | yes      | yes                           |
| **Builder**        | Works the cards: the coach talks a card's plan through in its comments; the builder builds it test-first in a working copy of its own, runs the checks, opens a pull request, fixes review comments | Board, a tracker, GitHub as code host | yes      | yes, for GitHub boards        |
| **Ideas**          | The owner starts an idea with a sentence and works it out with the idea coach on a map; Ready puts the agreed plan on the Backlog                                                                   | Board                                 | yes      | partly                        |
| **Prototypes**     | The coach has a clickable prototype of an idea made in the real app, version by version, before anything is built                                                                                   | Ideas, a kit with prototype mode      | no       | to come                       |
| **Made-up worlds** | Shared made-up data the prototypes run on, kept in step with the real data's shape; the coach can look at it and change it                                                                          | Prototypes                            | no       | yes, in Kobble's explorations |
| **Voice**          | The owner talks instead of typing; speech stays on the computer (a one-time download of about 0.8 GB)                                                                                               | –                                     | no       | yes (in the kernel today)     |
| **Usage log**      | A record of how the factory is used, for a study: every change to an idea, each prototype version with a picture; switched on for the team, kept on each computer                                   | Ideas                                 | no       | yes (Settings)                |
| **Updates**        | Tells the owner when a newer version of the project is ready and installs it on their computer, without git                                                                                         | –                                     | no       | yes (Settings, sidebar)       |
| **Desktop start**  | A shortcut that starts the factory and the products, for owners who do not use a terminal                                                                                                           | –                                     | no       | yes (Settings)                |

### What each brings

- **Board**: Build, the board's page; a card in Review opens its pull
  request. There is no Planning stage: work is thought through outside the
  factory, in explorations.
- **Made-up worlds** (`core/src/kobble/world.ts`, `situations.ts`;
  `server/src/kobble/world-route.ts`, `explorations/worlds.ts`,
  `world-tools.ts`): a product names a folder of situations as its `world`
  in `product.json` (`<key>.json`: `name`, `about`, `clock`, `signed_in`,
  `tables`), and may give a `checkWorld` command that checks them against
  its own schema (`software-factory check` runs it). Each exploration's
  prototypes share one world, kept as `world.json` beside the exploration:
  started from the first situation, or from a persona's (`situation` in its
  file) when its test or a prototype opened for it starts it, with every
  time moved to now; versioned, so a change made on an older version is
  refused; started again on request. The prototypes' start command gets
  `FACTORY_WORLD_URL=http://localhost:<port>/api/kobble/world/<exploration>`:
  `GET` the world (`{situation, version, signed_in, tables}`), `POST`
  `{version, changes: [{table, op, row}]}` (409 when stale), `POST …/reset`.
  It answers pages on any port of this computer (CORS for localhost only)
  and is asked again every few seconds, so tabs and devices share it live.
  The kobold changes it with `look_at_world`, `world_rows`, `change_world`
  and `use_situation`. Acme's Orders service has three situations.
- **GitHub**: connecting; signals from GitHub as they happen (`gh webhook
forward`, no public address needed) and a check every few minutes for
  anything missed; a hidden mark on the factory's own comments, because the
  owner and the factory may post with the same account.
- **Builder** (`server/src/builder/`): Build shows the connected
  board's cards, read every minute. The builder builds one card
  at a time on its branch (`factory/issue-<number>`, continuing a prototype
  pushed there) in a copy of its own. The rules are pure (`decide.ts`): a
  card in To do is built as it is, its text the plan; it waits while a
  question on it is open, staying in To do (the Factory page shows it
  waiting for the owner); a build that failed for a technical reason is
  tried again; an interrupted build resumes; merged or closed
  cards go to Done. Before a pull request the factory runs each changed
  product's verify command itself, gives the builder one round to fix a
  failure, and opens a draft that says so when the checks still fail.
  Comments on the card or the pull request in Review are answered on the
  same branch. It never merges. Its guide (how to work through the board) is
  the factory skill's `board.md`. Each lane works on up to five cards at
  once (the Builder setting "Cards at once"), each in a copy of its own
  (`build`, `build-2` …), and the builder can use a model of its own. Before
  each build or review fix on a branch that exists, the latest main is
  merged in; a clash goes to the builder to settle, or back to the owner.
  When Claude's usage limit stops a job, the card says so and waits where it
  is, and the factory carries on by itself once the limit resets. GitHub's
  signals come as they happen (`gh webhook forward`, no public address
  needed), with reading the board every minute as the fallback (every ten
  minutes while signals come). Still to come: starting by itself, Jira.
- **Ideas**: Explore and the idea coach's guide; choice cards for real
  choices with the coach's recommendation and the trade-offs, said early; an
  Agreed switch; pictures the owner pastes; parking, dropping and drafts; a
  short summary of the product in the coach's first prompt; the plan written
  as a card when the owner presses Ready.
- **Prototypes**: the prototype maker's guide; a conversation kept open per
  idea with the apps running live; each version kept, opening on the screen
  the idea is about; the coach makes small changes itself; a check that no
  prototype code reaches the real app. It asks each kit for its prototype
  mode and its starter, so a brand-new app starts from the kit's starter.
  The React web app and Expo app starters have the prototype mode, the
  shared world's hook and that check already (see the kits).
- **Usage log** (off by default, the Usage log setting): every change to
  an exploration as a line of JSON in a folder next to the project
  (`<project>-usage`), each prototype's change as a patch and, when it is
  opened, a picture at a computer's and a phone's width.
- **Updates** (the sidebar when something needs the owner, Settings ›
  Updates): the owner's folder takes the newest main from GitHub without
  git, only when nothing can be lost, by itself every few minutes (on
  unless the owner switches it off). After it, what the changes need is installed when their
  package files changed; when that brings a new Kobble, the factory starts
  again on it with the parts that ran; otherwise the running products start
  again. A newer Kobble release is looked for once a day; Prepare the
  upgrade puts "Upgrade Kobble to <version>" on the board for the builder,
  whose pull request, once merged, reaches every computer the same way.
- **Desktop start** (Settings › This computer): a file on the desktop that opens the
  factory with a double-click (`.cmd` on Windows, `.command` on macOS).
- **Voice**: Talk; live words while the owner speaks; a first draft as soon
  as they go quiet; the answer read out as it is written; "stop" interrupts.

## The kits

| Kit                                   | Here | Starter                                                                                                                           | To come                                                                       |
| ------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| React web app                         | yes  | its own (`starters/react-web-app`): the kit's standards and checks, prototype mode with a shared world, `check:prototypes`        | a working copy's environment, the checks to run before a pull request         |
| Expo app                              | yes  | its own (`starters/expo-app`): the kit's standards and checks, prototype mode with a shared world, `check:prototypes`             | a working copy's environment, the checks to run before a pull request         |
| NestJS backend                        | yes  | its own (`starters/nestjs-backend`): the kit's standards and checks, settings, migrations, a health route; the database a setting | a working copy's environment, the checks to run before a pull request         |
| SvelteKit web app, TypeScript package | yes  | the framework's own generator                                                                                                     | a starter with the kit's standards and checks, prototype mode (for a web app) |
| Other code                            | yes  | –                                                                                                                                 | –                                                                             |

A kit with a starter makes a new product as a copy of it (`starter` in the
kit, `copyStarter` in the core): the starter's package name, wherever it is
written, becomes the product's, and `create` then installs its packages.
Each starter is a whole product with its own checks (`npm run verify` in
it); the core's own checks leave the `starters/` folder out.

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
grey ground with a white sidebar, white cards with a hairline ring and
dark buttons; [the design system](reference/design-system.md) lists its
variables, type and pieces. `factory/theme.css` changes it: the server gives it to the dashboard, which
loads it after its own styles (`packages/server/src/theme.ts`). It sets the
variables (colours, `--font-body`, `--radius`, shadows; the dashboard is
light only for now, so rules inside `@media (prefers-color-scheme: dark)` are
switched off)
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
   extension points for pages, agent tools and workflow steps; a working
   copy's own environment. Then a first release.
2. **The theme**: written again when the owner asks; the logo.
3. **Builder** (done for GitHub boards); the Board's dragging, GitHub's signals and Jira after.
4. **Ideas**, the rest of it.
5. **Prototypes**, with the kits' starters and prototype mode; then
   **Made-up worlds**.
6. **Voice** as an add-on of its own, with live words and quick drafts.
7. **Usage log**, **Updates**, **Desktop start**.

Each step is a release, tried on the example company first.

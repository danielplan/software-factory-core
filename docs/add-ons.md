# The add-ons: choosing the factory's parts

A company chooses which parts of the factory it uses. The kernel is always
there; every ability beyond it is an add-on, switched on or off in
`factory.json` and in the dashboard's Marketplace. Built-in add-ons
(`core: true`) are on unless the company switches them off; the others are
off until it switches them on. An add-on says what it needs, and
`assembleFactory` refuses a factory where something it needs is missing.

This page lists what the core ships, what each piece needs and adds, how
far each is, and what comes next (see
[How companies update](architecture.md#how-companies-update)).

## The kernel (always there)

| Piece                                                                                                                 | Here                                  |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Loading products, extensions and kits; the company file; `assembleFactory`                                            | yes                                   |
| Parts: start, watch and stop them; the product's parts on System, the factory's in Settings                           | yes                                   |
| Settings groups and the Settings page                                                                                 | yes                                   |
| Running Claude Code (kept open between turns), working copies                                                         | yes                                   |
| The skills the agents follow and the knowledge base with its checks                                                   | yes                                   |
| Setting up in steps with the setup coach; Set up Kobble, then a first exploration                                     | yes                                   |
| Home (built from the extensions' blocks) and System (the product's parts on a map)                                    | yes                                   |
| Sprocket, the support kobold at the bottom of every page                                                              | yes                                   |
| The Marketplace: extensions, connections and product kits                                                             | yes                                   |
| **The theme**: the dashboard takes the look of the company's own app (see below)                                      | yes; written again on request to come |
| **Add, remove and upgrade**: `software-factory upgrade` from the command line, adding and removing in the Marketplace | yes                                   |
| **Extension points** for pages, Home blocks, kobolds and stages                                                       | yes; agent tools to come              |
| **A working copy's own environment** (its own ports and database), asked of the product or its kit                    | yes (`copyEnv`)                       |

## The add-ons

| Add-on             | What it does                                                                                                                                                                                      | Needs                                   | Built in               | Here                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------- | ------------------------------------------- |
| **Board**          | The work in its stages (Backlog, To do, In progress, Review, Done), on the connected board; a card in To do is the go-ahead                                                                       | –                                       | yes                    | yes, for GitHub boards                      |
| **GitHub**         | Where work is tracked (a GitHub board, through the GitHub CLI) and where the code lives (the `code` slot)                                                                                         | Board                                   | yes                    | yes                                         |
| **Jira**           | Where work is tracked: Jira Cloud with an API token                                                                                                                                               | Board                                   | yes                    | connecting only; its cards are not read yet |
| **Builder**        | Works the cards from To do: builds each test-first in a working copy of its own, in up to three sessions, runs the checks, pushes only what passes, opens a pull request, answers review comments | Board, a tracker, a code host           | yes                    | yes, for GitHub boards                      |
| **Explorations**   | Doodle, the explorer, thinks an idea through with the team on a whiteboard; the agreed prototype is handed off as a card in To do                                                                 | Board                                   | yes                    | yes                                         |
| **Prototypes**     | Tinker, Doodle's maker, makes the exploration's prototype in the real app, with variants and their states, before anything is built                                                               | Explorations, a kit with prototype mode | yes, with Explorations | yes                                         |
| **Signals**        | What the live app reports, missions and the feedback board, each a bug, an idea or a question                                                                                                     | –                                       | yes                    | yes                                         |
| **Personas**       | Made-up customers who try the app on missions (the tester kobold)                                                                                                                                 | Signals                                 | yes                    | yes                                         |
| **Releases**       | A numbered release of the product, with notes from the merged pull requests                                                                                                                       | Board                                   | yes                    | yes, on GitHub                              |
| **Made-up worlds** | Shared made-up data the prototypes run on, kept in step with the real data's shape; Doodle can look at it and change it                                                                           | Prototypes                              | no                     | yes, in Kobble's explorations               |
| **Voice**          | The owner talks instead of typing; speech stays on the computer (a one-time download of about 0.8 GB)                                                                                             | –                                       | no                     | yes (in the kernel today)                   |
| **Usage log**      | A record of how the factory is used, for a study: every change to an exploration, each prototype change with a picture; switched on for the team, kept on each computer                           | Explorations                            | no                     | yes (Settings)                              |
| **Updates**        | Tells the owner when a newer version of the project is ready and installs it on their computer, without their using git                                                                           | –                                       | no                     | yes (Settings, sidebar)                     |
| **Desktop start**  | A shortcut that starts the factory and the products, for owners who do not use a terminal                                                                                                         | –                                       | no                     | yes (Settings)                              |

### What each brings

- **Board**: the Factory page (`#build`), with Stuck above its columns; a
  card in Review opens its pull request. There is no Planning stage: work
  is thought through outside the factory, in explorations, and a card in To
  do is the go-ahead.
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
- **Builder** (`server/src/builder/`): the Factory page shows the
  connected board's cards, read every minute; it is on when the factory
  starts. The builder builds a card on its branch (`factory/issue-<number>`,
  starting from the agreed prototype's code) in a copy of its own. The rules
  are pure (`decide.ts`): a card in To do is built as it is, its text the
  plan; an interrupted build resumes; merged or closed cards go to Done. A
  build is up to three sessions in a row (`sessions.ts`). Before a pull
  request the builder brings the knowledge base in line with what it built
  (`knowledge-kept.ts`), then the factory runs each changed product's verify
  command itself and gives the builder up to three rounds to fix a failure;
  then it commits and pushes through the repository's own git hooks (what
  they refuse is fixed in the same rounds) and opens the pull request where
  the code lives (the code host, from the `code` slot, `code-host.ts`). Work
  whose checks fail is never pushed: it stays on the card's branch in the
  factory's copy. When the builder asks a question, gives up, or uses its
  sessions, the card goes to Backlog marked stuck and waits in the Factory
  page's Stuck list for a hint, or Continue
  ([stuck cards](architecture.md#kobbles-files)). Comments on the card
  or the pull request in Review are answered on the same branch; when the
  checks then fail, the pull request goes back to a draft until they pass.
  It never merges. Its guide (how to work through the board) is the factory
  skill's `board.md`. It works on up to five cards at once (the Builder
  setting "Cards at once"), each in a copy of its own (`build`, `build-2`
  …), and can use a model of its own. Before each build or review fix on a
  branch that exists, the latest main is merged in; a clash goes to the
  builder to settle, or back to the owner (Resolve). When Claude's usage
  limit stops a job, the card says so and waits where it is, and the factory
  carries on by itself once the limit resets. GitHub's signals come as they
  happen (`gh webhook forward`, no public address needed), with reading the
  board every minute as the fallback (every ten minutes while signals come).
  Still to come: Jira's cards.
- **Explorations**: Doodle and its guide (`exploration-coach.md`); the
  whiteboard with the problem, what was heard, choices with Doodle's
  recommendation, one living diagram, rare notes and pasted pictures; Sketch
  and Agreed on each thing; parking another idea as an exploration of its
  own; dropping; the hand-off: a spec written in the plan's four steps
  (`handoff-spec.md`) and the card in To do.
- **Prototypes**: Tinker and the `explore` skill; one prototype per
  exploration, in its own copy of the code, with up to four variants and
  their states, switched by the page address; one conversation kept per
  prototype; it runs while it is made, opens on the page the change is on,
  and is looked at in pictures before it is called ready; a check that no
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
  their using git, only when nothing can be lost, by itself every few minutes (on
  unless the owner switches it off). After it, what the changes need is installed when their
  package files changed; when that brings a new Kobble, the factory starts
  again on it with the parts that ran; otherwise the running products start
  again. A newer Kobble release is looked for once a day; Prepare the
  upgrade puts "Upgrade Kobble to <version>" on the board for the builder,
  whose pull request, once merged, reaches every computer the same way.
  Settings › Updates also says what each Kobble version changed (What's new
  in Kobble, from the `WHATS-NEW` files).
- **Desktop start** (Settings › This computer): a file on the desktop that opens the
  factory with a double-click (`.cmd` on Windows, `.command` on macOS).
- **Voice**: Talk; live words while the owner speaks; a first draft as soon
  as they go quiet; the answer read out as it is written; "stop" interrupts.

## The kits

| Kit                                   | Here | Starter                                                                                                                           | To come                                                                       |
| ------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| React web app                         | yes  | its own (`starters/react-web-app`): the kit's standards and checks, prototype mode with a shared world, `check:prototypes`        | a working copy's environment                                                  |
| Expo app                              | yes  | its own (`starters/expo-app`): the kit's standards and checks, prototype mode with a shared world, `check:prototypes`             | a working copy's environment                                                  |
| NestJS backend                        | yes  | its own (`starters/nestjs-backend`): the kit's standards and checks, settings, migrations, a health route; the database a setting | a working copy's environment                                                  |
| SvelteKit web app, TypeScript package | yes  | the framework's own generator                                                                                                     | a starter with the kit's standards and checks, prototype mode (for a web app) |
| Other code                            | yes  | –                                                                                                                                 | –                                                                             |

A kit with a starter makes a new product as a copy of it (`starter` in the
kit, `copyStarter` in the core): the starter's package name, wherever it is
written, becomes the product's, and `create` then installs its packages.
Each starter is a whole product with its own checks (`npm run verify` in
it); the core's own checks leave the `starters/` folder out. Each kit names
the command that checks a product of its kind (its `verify`, `check` or
`test` script), which the factory runs before a pull request, and one
library per job (`packages/kits/rules/<kit>/`, `software-factory rules`).

## What stays with a company

Its products and their code, its own rules and decisions (for example, one
database server for all its products), its made-up data, its words. A rule
from a company that would hold for any company comes here as a lesson, in
general terms.

## The theme

The factory is a system of its own, next to the company's app: it should feel
related to the app, never be mistaken for it. The theme takes the app's own
colours, fonts and corners as they are (never shifting a brand colour), and
the logo beside the factory's name. The factory keeps its own face (its
kobolds, never the app's own mascot or assistant), its own layout and its
own name.

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
readable on them (WCAG AA), and every file it names is in the project. The
coach also copies the app's logo to `factory/logo.svg` and names it as
`--logo`, with the app's wordmark (`--wordmark`), shown beside the
project's name in the sidebar (`packages/dashboard/src/lib/brand.ts`). To
come: writing the theme again when the owner asks. The components themselves are never changed in a company:
more than the theme allows is a change asked of the core.

## The order

What is done: the kernel, the Marketplace, Home and System, Sprocket, the
theme, the Board and Builder for GitHub boards, Explorations with
prototypes and made-up worlds, Signals, Personas, Releases, Voice, Usage
log, Updates and Desktop start. What comes next:

1. **Agent tools** as an extension point, so an extension can give a
   kobold tools of its own.
2. **Jira's cards** for the builder, and other code hosts (GitLab say) as
   add-ons that fill the `code` slot.
3. **A working copy's environment** from each kit.
4. **The theme** written again when the owner asks.
5. **Voice** as an add-on of its own.

Each step is a release, tried on the example company first.

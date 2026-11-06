# Changelog

What changed in each release of the core, and what a company has to do when it
upgrades. Newest first. Versions follow [semantic versioning](https://semver.org/):
a major version may need a company to change something, and says what.

## Unreleased

## 0.3.0 (2026-11-06)

**To upgrade:** pin `"software-factory":
"github:danielplan/software-factory-core#release-0.3.0"` in the project's
devDependencies, `npm install`, then `npx software-factory upgrade` (it
pins the core itself from now on).

- **The core installs from this repository.** A release is the core built
  as one package (`scripts/build-release.mjs`: compiled to JavaScript, its
  packages bundled, the dashboard built) on the `release` branch, tagged
  `release-<version>` (`npm run release -- --push`). Setting up a factory
  and `software-factory upgrade` pin it in the project's `package.json`;
  everyone with the project runs it with `npx software-factory`
  ([releasing the core](docs/releasing.md)).
- The method's skills and the agents' ground rules call `npx software-factory`;
  a migration changes the line in a factory's `AGENTS.md`.
- **An `upgrade-factory` skill** in the method: a coding agent runs
  `software-factory upgrade`, does the small changes it lists under "Needs
  you", asks about the ones that are the owner's choice, checks again and
  hands the result over for review. Every factory gets it with its next
  `software-factory upgrade`.

## 0.2.0 (2026-11-06)

**To upgrade:** run `software-factory upgrade` in the project, review the
changes, commit them.

- **`software-factory upgrade`** brings a factory to the core it runs on:
  the migrations of each release since its version, the method's skills
  and the kits' MCP servers refreshed, the version written into
  `factory.json` (`core`), and the checks. A factory without a version is
  on 0.1.0.
- A product's own program counts as running when it listens on its port
  from its own folder, also where the health check cannot reach it (a
  development server on IPv6 only), instead of showing as stopped or as
  "used by another program".
- **Planning in a coding agent, from the board's cards.** `software-factory
card` (list, show, new, move, comment, agree) works with the cards of
  the connected GitHub board from the project, for the coding agents and
  the owner (`server/src/cards/`). `agree` writes the agreed plan into the
  card (between marks, with the prototype's branch and who agreed when),
  refuses a prototype branch that is not pushed, and moves the card to
  ready, where the factory's runner (on whichever computer runs it) takes
  it. The `factory` skill works from the board; the `plan` skill plans a
  card with prototypes on its branch (`factory/issue-<number>`) and hands
  it on when the person agrees. A company upgrading gets the skills and the
  line in `factory/AGENTS.md`.
- **The method's skills reach the coding agents.** Making the factory's
  folder puts the method's skills (factory, plan, build-test-first,
  review-structure, show-result, update-context) in the project's
  `.claude/skills` and `.agents/skills`, so planning and building with the
  method works in Claude Code and Codex too. A skill folder the factory put
  there is replaced by a newer one; one of the project's own with the same
  name is left alone (`server/src/install-skills.ts`). A factory made
  before gets them on its next upgrade.
- The factory takes in every card on a connected board unless the owner
  asks for only the cards with a label (`*` is the default label, before
  `factory`). Boards connected before keep their label.
- **Another copy of the project is not taken for this one.** When a part's
  port is in use, the launcher asks which folder the program on it runs in
  (lsof, on macOS and Linux); a program from another folder (a second
  working copy, a worktree) is a problem that names that folder, not "running,
  started outside the factory". A port counts as taken on IPv4 or IPv6, so a
  development server listening only on ::1 is noticed too.
- **A part can start with what uses it** (`start: "with"`): it has no
  buttons of its own and starts when a part that depends on it starts (a
  TypeScript package's watch build). System's headline leaves it out and
  says when only some products run. A company whose package part was
  `auto` gets `with` from the kit.
- On Settings, changing where work is tracked starts from the board
  connected now: its step is done, and its repository, board, columns and
  label are already chosen.
- **Kits bring their MCP servers** (`mcp` in `defineKit`): written into the
  project's `.mcp.json` when a product of their kind is added, only where
  the project has no server of that name (`server/src/kit-servers.ts`). The
  SvelteKit kit brings Svelte's own (documentation and the autofixer), and
  its rules say to use it.
- **A TypeScript package kit** (`typescript-package`): shared code given out
  as a package (exports, main or types; TypeScript; no framework; no start
  script), checked with its own check or its build, and kept built by its
  watch script while the others run.
- **A SvelteKit web app kit** (`sveltekit-app`): it recognises a SvelteKit
  app by its packages, runs it with Vite's server, checks it with its check
  script (svelte-check) and makes a new one with SvelteKit's own starter
  (`sv`); its rules are the usual SvelteKit way and its lessons. A company
  with a SvelteKit app described as Other code can change the product's
  kind to `sveltekit-app` and add the kit to `factory.json`.
- The dashboard is wider (up to 1600px), so the board's six columns have
  room.
- **Only the tracker in use is on.** Choosing where work is tracked switches
  the other built-in trackers off (the factory's own board: all of them);
  Settings still offers each, and switches one on when it is chosen.
  Settings shows the connected board (a link, the label, which column each
  stage is) and folds the choice away under "Change where work is
  tracked".
- **Add-ons in two parts**: "In use" (the board work is tracked on, the
  add-ons on, the kits of the products) and "Not used", greyed. A board is
  changed on Settings, not added here.
- **The Board** fits all six stages in one row and says where work is
  tracked, with a link.
- **Setup is kept.** The setup conversation, its map, whether the factory
  is being built and Claude Code's conversation are kept in
  `factory/setup.json` once something was said or drawn, so setup goes on
  where it was when the factory is started again, and the project keeps a
  record of how its factory was set up (`coach/setup-record.ts`).
- **The GitHub board is set up in setup, with the owner.** The setup coach
  hears where the code is on GitHub and the boards there (their columns and
  cards), agrees on one with the owner, or a new one, and while building
  `configure` takes `board`: it connects that board, or makes one linked to
  the code with the factory's stages as its columns, and adds the stages'
  missing columns to a board that is there only when the owner agreed,
  keeping its own (`add-ons/github/board-setup.ts`, through
  `connect/tracker-setup.ts`; the session's `coach.trackers`). A board
  connected in setup needs no step after opening.
- The coaches' replies are shown as Markdown (paragraphs, bold, lists,
  links, code, small tables) with `react-markdown` and `remark-gfm`; the
  owner's own words stay as typed.
- **Knowledge lives in the repository.** The agents' ground rules
  (`packages/method/templates/AGENTS.md`) say what is known goes into the
  knowledge base, a blueprint or a decision, never only into an agent's own
  memory; the setup coach writes notes it found in such a memory into the
  knowledge base. A GitHub board is the factory's standard place for work:
  the setup coach recommends it when the code is on GitHub. A company
  upgrading adds the rule to its `factory/AGENTS.md`.
- The setup coach draws what the project's own documentation says as
  confirmed, naming where it says so, so only its own guesses stay open;
  each rule starts with the part it is about; pictures only where they
  show clearly what people see.
- Opening a factory built in setup asks where work is tracked only when
  setup chose a GitHub or Jira board that is not connected yet; the
  factory's own board needs no step. The setup coach's theme takes the
  app's colours as they are, never shifting a brand colour.
- **Building writes the factory's look.** When the project has an app
  people see, the setup coach writes `factory/theme.css` from it while
  building, and the factory's checks look at the theme: the colours text
  sits on, set for light and dark as plain colours and readable (WCAG AA,
  4.5:1), and the files it names (`theme-check.ts`, with postcss and
  culori). The setup coach asks once which add-ons the owner wants, and
  draws arrows only inside an area.
- **Setup draws the whole picture first.** The coach's guide names what
  building needs (what the factory builds, what each must keep, what the
  project is, how work will go), and the coach drafts all of it in its first
  turn, then asks only about weak guesses. **Build the factory** appears
  only once the coach says the map is ready (`draw` takes `ready`; the
  draft keeps it).
- **The map is laid out area by area**, then the areas together, so cards and
  areas no arrow joins are packed in rows instead of one long line; the
  view is centred in the room beside the coach.
- **The setup coach starts from what is there.** In a project with code,
  its first message carries the project's history (from git: how long, how
  lately, how many people, the latest commits) and lists the documentation
  already in it (`packages/server/src/coach/project-facts.ts`). Its guide has
  it read that documentation first and link to it instead of writing it
  again, decide how real the project is from evidence and name it, draw the
  pieces of code the factory will build with their kind and checks, keep one
  topic per area, label every arrow, and give rules and questions none. The
  knowledge base's index lists the project's own documentation, which stays
  the source for what it covers.
- **The factory's look** is calmer: a light neutral ground, white cards with
  a hairline, one accent colour (an indigo), the coach's messages beside its
  orb; a guess on the map is a plain card, and an agreed one has a tick
  (no more dashed borders). Rows on the map have room for their arrows.
- **A company's theme**: `factory/theme.css`, when there is one, is loaded
  after the dashboard's own styles, so its variables win; it may use the
  project's own fonts and pictures through `/api/theme/file`. The font is the
  variable `--font-body`.
- **A Planning stage** between Backlog and To do: work whose plan is talked
  through with the owner in its conversation until it is agreed (for work
  that did not come through Ideas); To do stays the owner's go-ahead to
  build. Connecting a board suggests a column for it from names such as
  Planning or Refinement. A `board.json` written before reads Planning as
  no column; a company that wants one picks its column on Settings.

- **Setup is planned on a map, then built by the coach.** The setup coach
  reads the project with Claude Code's own tools (read-only while planning)
  and has two tools of its own: `draw`, for the map it plans with the owner
  (small cards in areas, arrows, pictures from the project, rules and
  questions marked, laid out along the arrows with ELK), and `configure`,
  for the factory's own settings once the owner presses **Build the
  factory** (the project, its products, the tracker, add-ons, settings and
  tools to install, each checked as it is saved). Building, it may write in
  the project (never `.env` files): it writes the blueprints and the
  knowledge base's pages itself. The owner then presses **Open the
  factory**. Routes: `/api/setup/say`, `/api/setup/draft` (the owner moves
  or takes off a card), `/api/setup/build`, `/api/setup/open`. Gone: the
  coach's earlier drafting tools, the setup form, `POST /api/setup/make`,
  `POST /api/company`, `POST /api/products`, `POST /api/company/tracker`,
  `GET /api/folders`, `POST /api/setup/detect` and Mermaid.
- The setup page is plain: at first only the coach's question; then the
  canvas and the conversation beside it. A card shows only what it says; it
  is dragged anywhere or taken off, and changed by telling the coach. A
  folder button opens a project to start from, which the coach reads before
  asking anything.
- **Voice**: the owner can press Talk and speak with a coach. Whisper in the
  browser writes their words down; the answer is read out as it is written
  (Piper in the browser, else the browser's own voice); saying "stop"
  interrupts it. English, German, Italian, French and Spanish. The speech
  model is downloaded once (about 0.8 GB); what is said stays on this
  computer.
- **Ideas**: the owner starts an idea with a sentence and works it out with
  the idea coach (the method's `guides/idea-coach.md`) on a map, as in
  setup; the coach gives it a short title (`draw` takes `title` on an
  idea's map). **Ready** puts the agreed plan on the board's Backlog. Each
  idea is a file in the factory's `ideas/` folder. Both coaches share one
  conversation class (`coach/talk.ts`).
- **The dashboard** opens on the **Board**: a line saying what the factory
  is doing now, then the work in its columns. Ideas, System (the products,
  with Start all and Stop all, then the factory itself) and Settings (one
  card per topic, listed at the side) are on a rail of icons. The
  **Products** tab, the factory overview and the addresses are gone. One
  font, shadcn components, one colour per stage, a soft gradient in the
  light theme.
- **Where work is tracked**, chosen right after the factory is opened (the
  state says `onboarding` until then) and again on Settings: the
  **factory's own board** (tracker `none`, nothing to connect), a **GitHub
  board** through the GitHub CLI (installed if missing, signed in in the
  browser with a one-time code, repository and board picked from lists), or
  **Jira Cloud** with an API token (checked against Jira, which lists the
  projects). Connecting picks the label of the work the factory takes in
  (`factory` by default, `*` for all) and matches the board's columns to the
  factory's stages, suggested from their names. `POST
/api/connect/own-board` keeps the factory's own board.
- **GitHub and Jira are add-ons**, the first real ones: each is an
  extension (`tracker: true`, built in and on unless switched off with
  `without`) with its own routes at `/api/add-ons/<id>/…` (answered only
  while it is on) and its own connecting steps on the page
  (`packages/server/src/add-ons/`, `packages/dashboard/src/add-ons/`). The
  company's `tracker` is `none` or the id of an add-on that tracks work;
  the factory's checks say so when it names none that is on. `startServer`
  takes `addOns` instead of `connectors`. The `trackers` extension is gone.
- An **Add-ons** page on the rail, laid out as a store: tiles with each
  one's logo (from `simple-icons`) on shelves by what they are for (where
  work is tracked, more abilities, kinds of product). An add-on is added or
  removed there (`POST /api/add-ons` with `id` and `on`, written to
  `factory.json`; the add-on that work is tracked with cannot be removed),
  with its settings folded in while it is on; a kit shows the products it
  knows. The connect choices show the same logos. The state
  lists every add-on (`addOns`, on or off) instead of `trackers`, and each
  product says its `kit`. Settings keeps where work is tracked and the
  settings no add-on has.
- **One stage vocabulary** for work everywhere: `draft`, then `backlog`,
  `todo`, `doing`, `review`, `done` (`STAGES` in the server's `api.ts`).
  Ideas marked `ready` before are read as `backlog`.
- **`board.json`** in the factory folder keeps which board is connected,
  by tracker add-on: the label, the column for each stage, and what the
  add-on needs (the GitHub repository and board, or the Jira site, email and
  project). Only Jira's API token stays in the
  settings (`settings/jira.env`, the Jira add-on's group); the GitHub CLI keeps
  its own sign-in. **A company that connected a board on an earlier build
  of this branch connects it again** (the `GITHUB_*` and `JIRA_*` settings
  besides `JIRA_TOKEN` are no longer read).
- Kits: the **Other code** kit (`otherCode`) recognises any project by its
  project files (package.json, pyproject.toml, go.mod, Cargo.toml and
  others) and runs the start command it can tell. A kit can be a fallback
  (`fallback: true` in `defineKit`): it takes a folder only when no other
  kit finds a product there or below.
- The coach installs what the factory needs: tools on this computer (such as
  Git and the GitHub CLI) with the system's package manager (Homebrew,
  winget), or tells the owner how; add-ons go into `factory.json`. `Session`
  takes `tools` (`computerTools()` in the command).

- Setting up by talking: the setup coach (Claude Code on this computer) asks
  about the company, reads existing code, and draws the company and its
  products on a map that the owner can change, with a first blueprint per
  product; **Make the factory** writes it. The form stays as an option.
- The core runs Claude Code kept open between turns (`WarmClaude`) and turns
  its events into plain lines (`describeEvent`); a run can deny more tools
  (`deny`) and add instructions for the whole conversation (`instructions`).
- `addProduct` takes the product's first blueprint; products added in setup
  keep who uses them and what they need.
- The method has the coaches' guides (`guidesFolder`).

- A factory you can set up and run: `node packages/server/bin/software-factory.ts`
  opens the setup page (start something new, or bring existing code) and then
  the dashboard (System, Products, Settings).
- Products are described in the factory folder (`products/<id>/product.json`,
  with `code` pointing at their code) instead of in their own folders; the
  company file has `about` and `tracker` (none, GitHub board, Jira Cloud) and
  no `products` patterns.
- Kits recognise their kind of product in existing code (`detect`) and make a
  new one with the framework's starter (`create`); the first kits: React web
  app, NestJS backend, Expo app.
- The launcher; settings of the secret kind (saved, never shown again).

- The first version of the core: product descriptions (`product.json`), the
  company file (`factory.json`), the extension registry, parts, settings
  groups, running Claude Code and working copies (`packages/core`); the method
  (`packages/method`); the knowledge base's structure and checks
  (`packages/knowledge-base`); an example company (`examples/acme`).

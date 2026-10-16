# Changelog

What changed in each release of the core, and what a company has to do when it
upgrades. Newest first. Versions follow [semantic versioning](https://semver.org/):
a major version may need a company to change something, and says what.

## Unreleased

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
  factory's stages, suggested from their names. Routes under
  `/api/connect/…`; `POST /api/connect/own-board` keeps the factory's own
  board. `startServer` takes `connectors` (stand-ins in the tests).
- **One stage vocabulary** for work everywhere: `draft`, then `backlog`,
  `todo`, `doing`, `review`, `done` (`STAGES` in the server's `api.ts`).
  Ideas marked `ready` before are read as `backlog`.
- **`board.json`** in the factory folder keeps which board is connected:
  the GitHub repository and board, or the Jira site, email and project; the
  label; and the column for each stage. Only Jira's API token stays in the
  settings (`settings/tracker.env`, the `jira` group); the GitHub CLI keeps
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

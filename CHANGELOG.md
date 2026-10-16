# Changelog

What changed in each release of the core, and what a company has to do when it
upgrades. Newest first. Versions follow [semantic versioning](https://semver.org/):
a major version may need a company to change something, and says what.

## Unreleased

- Work can stay on the **factory's own board**, in the app: it is the
  first choice after setup and needs nothing connected (the tracker
  `none`, now shown as "The factory's board"). A connected GitHub board or
  Jira project takes in only the work labelled `factory`, or all of it
  (`*`): new settings `GITHUB_LABEL` and `JIRA_LABEL`, chosen when
  connecting. Connecting also matches the board's columns (a GitHub
  board's Status, a Jira project's statuses) to the factory's stages,
  suggested from their names and changed by the owner: settings
  `GITHUB_STAGE_*` and `JIRA_STAGE_*` (`BACKLOG`, `TODO`, `BUILDING`,
  `TRYING`, `DONE`), each a column's name encoded as in an address.
- The dashboard uses one font, shadcn's Card, Badge and Select, and a
  colour per stage of work (Draft, Backlog, To do, In progress, Review,
  Done) and per area. System says in a sentence how the factory is doing
  and what to do, without the "Next" line, and shows only the products
  (each card says what the part does); its status in a row of its
  own with Start all and Stop all, and the factory itself (ideas, where
  work is tracked, the builder) below the products. Settings has one card per
  topic (listed at the side when there are several); where work is
  tracked is chosen and connected right there, with the same steps as
  after setup. The factory overview and the addresses are gone; a part
  card shows its state in words only when the light does not say it. The pages sit on a
  soft gradient (plain in the dark theme), lower on the screen. The Ideas page's box is a plain
  card with Talk and Send below the text; what is said starts the idea.
- Connecting where work is tracked is guided, right after the factory is
  opened (and from the board's next steps and Settings): a **GitHub
  board** through the GitHub CLI on this computer (installed if missing;
  signing in in the browser with a one-time code the page shows; the
  repository and board picked from lists; the board checked before it is
  saved), or **Jira Cloud** with an API token (checked against Jira, which
  then lists the projects). The state says `onboarding` until the owner
  connects or chooses Later. `startServer` takes `connectors` (stand-ins
  in the tests).
- The dashboard opens on the **Board**: what the factory is doing now in
  a line beside its title ("Thinking about …", work waiting to be built,
  or "Waiting for work"), then every piece of work in its column (Backlog: the ideas agreed to; To do, In
  progress, Review and Done come with the builder). Work starts on the
  **Ideas** tab: one big box in the middle to say what to build next, the ideas so far
  below it (a draft, or ready), and each idea's workspace; an idea
  goes on the board once its plan is agreed. The **Products** tab is gone (the coach adds products; their
  descriptions are in the factory's files), and so are the add-products
  screens, `GET /api/folders` and `POST /api/setup/detect`. The company's
  name no longer heads every tab, and the rail sits against the edge,
  without the logo.
- Ideas: the idea coach gives each idea a short title (`draw` takes a
  `title` on an idea's map); until then it shows the first words. The
  owner starts an idea with a sentence and works it out
  with the idea coach (the method's `guides/idea-coach.md`) on a map, as in
  setup: the coach reads the code and the factory's knowledge and draws
  who it is for, the journey, what must never happen and what is open.
  **Ready** marks the plan as agreed (sending it to where work is tracked
  comes with the builder). Each idea is a file in the factory's `ideas/`
  folder. The setup and idea coaches share one conversation (`coach/talk.ts`).
- **System** is the factory's overview: the products and the factory
  itself side by side, compact part cards in a map, what is left to set up
  in a line, and what each part does.
- **Settings** has one card per topic: where work is tracked shows only the
  chosen tracker's settings, with what is set now and one Save; every card
  offers to restart the parts that read it; an Addresses card lists where
  each part answers.
- Setup is planned on a map and then built by the coach itself. The coach
  explores the code with Claude Code's own tools and has two of its own:
  `draw`, for the map it plans with the owner (small cards in areas,
  arrows, pictures from the project, rules and questions marked, and what
  to show the owner, all in one call), and `configure`, for the factory's
  own settings once the owner presses **Build the factory** (the project,
  its products, tracker, add-ons, settings and tools to install, checked as
  they are saved, with what the factory's checks still find). Building, it
  may write in the project: it writes the blueprints and the knowledge
  base's pages itself. The owner then presses **Open the factory**. The map
  is laid out along its arrows with ELK. Gone: the coach's `set_company`,
  `look_for_products`, `add_product`, `change_product`, `write_blueprint`,
  `add_note`, `add_diagram`, `change_thing`, `link`, `unlink`, `settle`,
  `look_at_canvas`, `look_at_computer` and `propose_install`, the draft's
  company and products, and `POST /api/setup/make` (now `/api/setup/build`
  and `/api/setup/open`). Mermaid is no longer used.
- The setup page is plainer. The conversation has no header: while the
  coach works, its orb turns in the chat beside what it is doing; during a
  call, the same orb is the voice. The title and the form are gone; **Build the
  factory** and **Open the factory** are in the chat. A card on the canvas shows only
  what it says and is dragged anywhere or taken off with its bin; the owner
  changes it by clicking it and telling the coach, not by editing it.
  Nothing for a company to do.

- Starting from an existing project is easier: a folder button beside the
  chat opens a folder browser, and the coach reads the chosen project before
  asking anything. Any project can be brought: the new **Other code** kit
  (`otherCode`) recognises a folder by its project files (package.json,
  pyproject.toml, go.mod, Cargo.toml and others), takes the start and check
  commands it can tell, and runs the start command from its button. A kit
  can be a fallback (`fallback: true` in `defineKit`): it only takes a folder
  in which no other kit finds a product, there or below, so a project's own
  apps win over the project as a whole. Nothing for a company to do.

- Voice is a core feature (it was planned as an add-on). On the setup page
  the owner can press Talk and speak with the coach: a speech model in the
  browser (Whisper) writes their words down, the coach's answer is read out
  loud as it is written (Piper, also in the browser; the browser's own voice
  when Piper cannot be used), and saying "stop" interrupts it. English,
  German, Italian, French and Spanish, chosen beside End call
  (`packages/dashboard/src/voice/languages.ts`). The speech model is
  downloaded once (about 0.8 GB); what is said stays on this computer. The
  setup coach's `say` takes `spokenIn`. Nothing for a company to do.
- Setup starts with nothing but the coach's question in the middle; the
  canvas, the conversation at the side and the button come once the owner
  answers. The tabs come once there is a factory, on a rail of icons at the
  left instead of the bar on top.

- Setup is one conversation and one canvas. The coach interviews the owner
  or reads their code first, and draws what it understands: the company and
  products, plus notes, diagrams (Mermaid) and arrows. Everything starts as a
  sketch and is drawn solid once agreed. The owner can edit, move and remove
  pieces, and click one to ask about it. The coach's tool `look_at_map` is now
  `look_at_canvas`, and `remove_product` is now `remove`.
- The coach decides what the factory needs installed (tools on this computer,
  such as Git and the GitHub CLI, and add-ons) and proposes each one with why.
  The owner approves it on the canvas. **Make the factory** installs only what
  was approved: add-ons go into `factory.json`, and tools are installed with
  the system's package manager (Homebrew, winget), or the owner is told how.
  `Session` now takes `tools` (`computerTools()` in the command).
  Nothing for a company to do.

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

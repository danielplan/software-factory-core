# How the core is built

The core is a small kernel: it finds a company's products, loads the
extensions and kits the company uses, and puts together what they add. It
does almost nothing by itself; every feature, the ones shipped with the core
included, plugs in the same way.

## The layers

| Layer                      | Who owns it                              | What                                                                                                                                                                             | Where                                                                                         |
| -------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Core**                   | the maintainer                           | loading products and extensions, parts, settings, running agents, working copies, the method, the knowledge base, voice                                                          | `packages/core`, `packages/skills`, `packages/knowledge-base`, `packages/dashboard/src/voice` |
| **Core extensions**        | the maintainer                           | shipped with the core, on unless a company switches one off: Explore (ideas) and prototypes, Build (the board with its coach and builder), Workshop (the system and the add-ons) | to come                                                                                       |
| **Add-ons**                | the maintainer, or a company for its own | chosen per company: made-up worlds                                                                                                                                               | to come                                                                                       |
| **Kits**                   | the maintainer                           | one per kind of product: Expo app, React web app, SvelteKit web app, NestJS backend, TypeScript package                                                                          | to come                                                                                       |
| **Products and knowledge** | the company                              | its apps and services, `docs/`, `runs/`, its own rules                                                                                                                           | the company's repository                                                                      |

The rule for any piece: if it would be true for a different company, it is
core, an extension or a kit; otherwise it is the company's.

## Setting up a factory

One command, run in the project (`npx software-factory`, to come), opens
the dashboard in the browser. Where the project has no factory yet, it
starts with setting up: one conversation and one map, in two steps.
**The setup coach** (Claude Code on this computer, signed in with the
owner's own account, following the skills package's
`packages/skills/guides/setup-coach.md`) first plans the factory with the
owner. It explores the code with its own tools (never `.env` files) and
draws how the system works on the map with one tool of its own, `draw`:
small cards framed in areas, joined by arrows, with pictures from the
project, the parts and who uses them, the main workflows, and inside them
what the code cannot say (how real it is, what must never happen, the
project's words, what is still open), one area at a time, each card a
guess until the owner agrees. The owner moves or removes cards, and
changes one by clicking it and telling the coach. When the owner presses
**Build the factory**, the coach may write in the project and builds it
itself: the factory's own settings through its other tool, `configure`
(the project, which makes the folder; its products; the tracker, add-ons,
settings and tools to install from `packages/server/src/installables.ts`,
only as the owner agreed), checked as they are saved, and the blueprints
and knowledge pages with its own tools, until the factory's checks find
nothing. The owner then presses **Open the factory**. Right after, the dashboard guides
connecting where work is tracked: a GitHub board through the GitHub CLI on
this computer, or Jira Cloud with an API token, each checked before it is
saved (the GitHub and Jira add-ons, `packages/server/src/add-ons/`). In a new project
(`software-factory new <name>`), the plan starts from what the owner wants
to build. The owner can talk instead of typing: voice is part of
the core (`packages/dashboard/src/voice/`). A speech model runs in the
browser (Whisper) and writes their words down; the coach's answer is read
out loud as it is written (Piper, also in the browser), and saying "stop"
interrupts it. Nothing said leaves the computer except the written words
sent to the coach. There are two kinds of start:

- **Start something new** (greenfield): the company (the coach interviews the
  owner and writes the first knowledge pages), the first product (its kit
  creates it with the framework's own starter), where work is tracked, and the
  dashboard with the product running.
- **Bring an existing codebase** (brownfield): point at folders or
  repositories; each kit recognises its kind of product and the commands that
  already exist; the owner confirms each product found. Nothing in their code
  is changed: an agent drafts each product's blueprint and the knowledge pages
  from the code as it is, for the owner to review, and the product's own ways
  become its rules where they differ from the kit's. Trust grows step by step:
  ideas and plans first, then builds as pull requests checked by the
  company's existing CI.

**The factory lives in the project**, in its `factory/` folder, kept in the
same repository as the code: the company file, the product descriptions,
the knowledge base and the history change with the code they describe, in
the same commits and pull requests, and every copy of the code has them.
The project's own `AGENTS.md` (and `CLAUDE.md`) point to the factory's
rules, so any agent working in the code finds them. What must not be shared
stays out of git (`factory/.gitignore`): the settings with their secrets
(`settings/`), the agents' working copies (`copies/`) and the records'
local database (`kobble.db`). The command finds
the factory from anywhere inside the project.

**Where work is tracked** is chosen right after the factory opens, and
changed on Settings: the factory's own board (nothing to connect), a GitHub
board, or **Jira Cloud**. Work goes through one set of stages everywhere:
a draft idea, then Backlog, Planning, To do, In progress, Review and Done (`STAGES`
in `packages/server/src/api.ts`). Connecting a board picks the label of
the work the factory takes in and matches its columns to these stages; the
factory's `board.json` keeps all of it, and only Jira's API token is kept
in the settings. Both trackers ship with the core; the builder works GitHub boards for now. In
Jira, issues move with the company's own workflow's transitions,
the coaching happens in the issue's comments, and the factory checks for
changed issues every minute (Jira's webhooks need a public address, and the
factory runs on this computer). **Where the code lives** (branches and pull
requests) is GitHub for now; GitLab or Bitbucket can be added as other code
hosts later.

## A company's factory folder

```text
acme/                    the project, one repository
├─ AGENTS.md             the project's rules, pointing to factory/AGENTS.md
├─ docs/                 what the company knows: its own docs and the
│                        knowledge base's sections, one space
├─ shop/                 a product's code, with product.json and BLUEPRINT.md
├─ orders/               another product, described the same way
└─ factory/              its factory
   ├─ AGENTS.md          the agents' ground rules and workflow
   ├─ factory.json       the company: its kits, add-ons and products' folders
   ├─ ideas/             the ideas shaped with the idea coach, one file each
   ├─ board.json         the connected board: label, a column per stage
   ├─ setup.json         the setup conversation and its map, kept
   ├─ runs/              its history
   ├─ kobble-seed.json   records to start from (the example company has one)
   ├─ kobble.db          the records, a local database, not in git
   └─ settings/, copies/ secrets and working copies, not in git
```

Each product describes itself next to its code (`shop/product.json`: kind,
users, commands; `shop/BLUEPRINT.md`: its structure, promises and checks),
and `factory.json` lists the products' folders from the project's root, so
the project can move as a whole. What the company knows is one space with its
own documentation: the project's `docs/`, the knowledge base's sections beside
the pages it already had (from 0.6.0; before, `factory/context/` and
`factory/products/`, which the upgrade moves).

The core never names a product. It reads each product's description (see
`productSchema` in `packages/core/src/products/product.ts`) and the company
file (`companySchema` in `packages/core/src/company/company.ts`).

## The records

Kobble (the dashboard's name) keeps the background story of a product:
who it is for, what happens to them, where things break, and what turned
out to work. These records live in a local SQLite database in the factory's
folder, `kobble.db`, through Node's own `node:sqlite` (no other library). It
is named in the factory's `.gitignore` as soon as it is made, so it never
goes into git; one person works with it at a time. Sharing the records with
the team through git comes later (records as small files, the database
rebuilt from them), with the same store and pages.

| Record       | What                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source       | where signals come from, and what kind: people, usage, errors, alerts, or persona runs                                                                 |
| Signal       | one thing someone said or did, single and never counted (only machine errors say how often); who it sounds like, why, who sorted it, and where it went |
| Persona      | a made-up person who stands for a kind of user: role, what they want, what they are based on                                                           |
| Customer     | a real customer, who is like one persona                                                                                                               |
| Story        | what a persona goes through, in scenes; a scene with signals as evidence is seen, one without is guessed; it breaks once, at one problem               |
| Problem      | a few signals read together, with what is behind them; assumed when it only comes from an idea                                                         |
| Real problem | what is really being solved for a persona, behind two or more of their problems                                                                        |
| Idea         | what the team thinks would help, started from a problem or by a team member                                                                            |
| Version      | a version of an idea; its branch is the prototype                                                                                                      |
| Ticket       | a GitHub issue the records know: an idea's version sent to Build, or a fix or an update from a signal                                                  |
| Outcome      | the answer to "did it work?" once its issue is closed                                                                                                  |

The schemas, the store, the rules and what is worked out from the records
are in `packages/core/src/records/`. Every write is checked against the
rules as a whole, in one transaction, and refused with a plain reason when it
would break one (`check.ts`): a signal has its source and only machine
errors are counted; a story breaks exactly once, at a problem of the same
persona, unless it is marked wrong; a problem has signals behind it, or is
assumed and comes from an idea's story; a real problem sits behind at least
two problems of one persona; a signal that feeds a story or a problem
sounds like that persona; a ticket comes from a version or from a signal;
persona runs are never evidence. Where a problem or an idea stands, and how
well a story is known (its seen scenes out of all of them), are worked out
each time and never stored (`derive.ts`).

The server opens the records once the project has its factory (in setup
there are none yet) and serves them for the Understand pages:
`GET /api/understand`, `/api/understand/persona?id=…`,
`/api/understand/story?id=…`, and everything at `GET /api/records`.
Signals come in through `POST /api/signals` (connectors that feed it come
later). Each change is told on the page's stream as a `records-changed`
event naming the records, beside the whole state
(`packages/server/src/records/`). An empty database is filled from
the factory's `kobble-seed.json` when there is one: the example company's
holds a made-up shop's personas and stories. `software-factory check`
checks the database and the seed.

## Extension points

Two things extend a factory. A **kit** (`defineKit`) teaches it one kind of
product. An **add-on** gives it an ability a company may want, or want
another of in its place: in the core it is an extension (`defineExtension`),
and in the server an `AddOn` (`packages/server/src/add-ons/add-on.ts`), the
extension with the routes the server answers for it, at
`/api/add-ons/<id>/…` and only while it is on; its page, if any, is in
`packages/dashboard/src/add-ons/`. Built-in add-ons (`core: true`) are on
unless the company file switches them off (`without`); others are switched
on by name (`extensions`); the owner switches them in the dashboard's
Workshop, which also lists the kits. The first add-ons are where work is tracked: a
GitHub board and Jira Cloud (`tracker: true`). What each adds:

| Point                              | What                                                                                                              | Today                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Parts                              | programs the factory starts, watches and stops                                                                    | extensions add their own; a kit makes the parts for each product of its kind (`partsFor`)                    |
| Settings groups                    | a topic, its `.env` file, its fields; shown on the Settings page                                                  | extensions                                                                                                   |
| Guides                             | Markdown joined to an agent's instructions (the coach, the prototype maker, the builder)                          | extensions and kits                                                                                          |
| Commands                           | the usual commands for a kind of product; a product's own win                                                     | kits                                                                                                         |
| Rules                              | conventions and lessons for a kind of product                                                                     | kits                                                                                                         |
| MCP servers                        | the tools agents use on a kind of product (its documentation, its checks), written into the project's `.mcp.json` | kits                                                                                                         |
| Pages, agent tools, workflow steps | the dashboard's pages, the coach's tools, the builder's steps                                                     | to come, with the core extensions                                                                            |
| Trackers                           | where work is tracked: a GitHub board, Jira Cloud                                                                 | add-ons (`tracker: true`, routes, connecting steps); the builder works GitHub boards (`server/src/builder/`) |
| Code hosts                         | where branches and pull requests go: GitHub                                                                       | GitHub, in the builder (`server/src/builder/pull-requests.ts`)                                               |
| Detection                          | a kit recognises its kind of product in existing code                                                             | to come, with the setup page                                                                                 |

Which add-ons the core ships, what each needs, and the order they come in:
[the add-ons](add-ons.md).

`assembleFactory` (in `packages/core/src/extensions/registry.ts`) puts a
company's factory together and says, in plain words, everything that does not
fit before anything starts: an unknown extension or kit, a product whose kind
has no kit, a part listed twice, a dependency that is not there.

## How companies update

- **The core:** a project installs it from this repository at a release's
  tag, pinned in its `package.json` ([releasing the core](releasing.md)).
  A company's `factory.json` says which version of the core its
  factory is on (`core`). `software-factory upgrade`, run in the project,
  brings it to the core the command comes from: it runs the migrations of
  every release in between (`packages/server/src/upgrade/migrations.ts`),
  refreshes what the factory owns in the project (the skills, the
  kits' MCP servers), writes the new version and runs the factory's checks.
  It says what it did and what it leaves to the owner; the owner reviews the
  changes and commits them. A company never edits the core; it uses an
  extension point, or asks for a change here.
- **Extensions and kits:** each has its own version and release notes, and is
  switched on or off in `factory.json`. A kit's rules are read-only in the
  company; the company and each product add their own on top, and where they
  differ, the product's rule wins, with the reason written down.
- **Their own work:** products, knowledge and own rules change through normal
  runs in the company's repository.
- **Lessons for everyone:** a lesson from a company that would hold for any
  company is marked as a suggestion for the core (the update-context skill),
  written without company details, and comes here as a change.

Every release is tried on the example company (`examples/acme/`) first.

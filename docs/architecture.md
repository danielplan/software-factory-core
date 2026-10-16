# How the core is built

The core is a small kernel: it finds a company's products, loads the
extensions and kits the company uses, and puts together what they add. It
does almost nothing by itself; every feature, the ones shipped with the core
included, plugs in the same way.

## The layers

| Layer                      | Who owns it                              | What                                                                                                                          | Where                                                                                         |
| -------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Core**                   | the maintainer                           | loading products and extensions, parts, settings, running agents, working copies, the method, the knowledge base, voice       | `packages/core`, `packages/method`, `packages/knowledge-base`, `packages/dashboard/src/voice` |
| **Core extensions**        | the maintainer                           | shipped with the core, on unless a company switches one off: Ideas tab and prototypes, GitHub runner, System and Factory tabs | to come                                                                                       |
| **Add-ons**                | the maintainer, or a company for its own | chosen per company: made-up worlds                                                                                            | to come                                                                                       |
| **Kits**                   | the maintainer                           | one per kind of product: Expo app, React web app, NestJS backend                                                              | to come                                                                                       |
| **Products and knowledge** | the company                              | its apps and services, `context/`, `runs/`, its own rules                                                                     | the company's repository                                                                      |

The rule for any piece: if it would be true for a different company, it is
core, an extension or a kit; otherwise it is the company's.

## Setting up a factory

One command, run in the project (`npx software-factory`, to come), opens
the dashboard in the browser. Where the project has no factory yet, it
starts with setting up: one conversation and one map, in two steps.
**The setup coach** (Claude Code on this computer, signed in with the
owner's own account, following the method's
`packages/method/guides/setup-coach.md`) first plans the factory with the
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
nothing. The owner then presses **Open the factory**. In a new project
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
(`settings/`) and the agents' working copies (`copies/`). The command finds
the factory from anywhere inside the project.

**Where work is tracked** is chosen in setup: a GitHub board, **Jira Cloud**,
or none yet (the Ideas tab only). Both trackers ship with the core runner. In
Jira, each step (Planning, Todo, In Progress, Review, Done) is mapped to a
status of the company's own workflow, issues move with Jira's transitions,
the coaching happens in the issue's comments, and the factory checks for
changed issues every minute (Jira's webhooks need a public address, and the
factory runs on this computer). **Where the code lives** (branches and pull
requests) is GitHub for now; GitLab or Bitbucket can be added as other code
hosts later.

## A company's factory folder

```text
acme/                    the project, one repository
├─ AGENTS.md             the project's rules, pointing to factory/AGENTS.md
├─ shop/                 a product's code
├─ orders/               another product's code
└─ factory/              its factory
   ├─ AGENTS.md          the agents' ground rules and workflow
   ├─ factory.json       the company: its kits and add-ons
   ├─ products/shop/
   │  ├─ product.json    the product described: kind, users, commands, code
   │  └─ BLUEPRINT.md    its structure, promises and checks
   ├─ context/           its knowledge base (from the template)
   ├─ ideas/             the ideas shaped with the idea coach, one file each
   ├─ runs/              its history
   └─ settings/, copies/ secrets and working copies, not in git
```

Each product's description points at its code with a path from it
(`../../../shop`), so the project can move as a whole.

The core never names a product. It reads each product's description (see
`productSchema` in `packages/core/src/products/product.ts`) and the company
file (`companySchema` in `packages/core/src/company/company.ts`).

## Extension points

An extension (`defineExtension`) or a kit (`defineKit`) says what it adds:

| Point                             | What                                                                                     | Today                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Parts                             | programs the factory starts, watches and stops                                           | extensions add their own; a kit makes the parts for each product of its kind (`partsFor`) |
| Settings groups                   | a topic, its `.env` file, its fields; shown on the Settings tab                          | extensions                                                                                |
| Guides                            | Markdown joined to an agent's instructions (the coach, the prototype maker, the builder) | extensions and kits                                                                       |
| Commands                          | the usual commands for a kind of product; a product's own win                            | kits                                                                                      |
| Rules                             | conventions and lessons for a kind of product                                            | kits                                                                                      |
| Tabs, agent tools, workflow steps | the dashboard's tabs, the coach's tools, the runner's steps                              | to come, with the core extensions                                                         |
| Trackers                          | where work is tracked: a GitHub board, Jira Cloud                                        | to come, with the runner                                                                  |
| Code hosts                        | where branches and pull requests go: GitHub                                              | to come, with the runner                                                                  |
| Detection                         | a kit recognises its kind of product in existing code                                    | to come, with the setup page                                                              |

`assembleFactory` (in `packages/core/src/extensions/registry.ts`) puts a
company's factory together and says, in plain words, everything that does not
fit before anything starts: an unknown extension or kit, a product whose kind
has no kit, a part listed twice, a dependency that is not there.

## How companies update

- **The core:** a company pins a version. An upgrade (a command, to come)
  updates the packages, copies the core's files the agents read into a
  read-only folder, runs the release's migrations and then the checks, on a
  branch of its own. A company never edits the core; it uses an extension
  point, or asks for a change here.
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

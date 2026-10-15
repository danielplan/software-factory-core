# How the core is built

The core is a small kernel: it finds a company's products, loads the
extensions and kits the company uses, and puts together what they add. It
does almost nothing by itself; every feature, the ones shipped with the core
included, plugs in the same way.

## The layers

| Layer                      | Who owns it                              | What                                                                                                                          | Where                                                         |
| -------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Core**                   | the maintainer                           | loading products and extensions, parts, settings, running agents, working copies, the method, the knowledge base              | `packages/core`, `packages/method`, `packages/knowledge-base` |
| **Core extensions**        | the maintainer                           | shipped with the core, on unless a company switches one off: Ideas tab and prototypes, GitHub runner, System and Factory tabs | to come                                                       |
| **Add-ons**                | the maintainer, or a company for its own | chosen per company: made-up worlds, voice                                                                                     | to come                                                       |
| **Kits**                   | the maintainer                           | one per kind of product: Expo app, React web app, NestJS backend                                                              | to come                                                       |
| **Products and knowledge** | the company                              | its apps and services, `context/`, `runs/`, its own rules                                                                     | the company's repository                                      |

The rule for any piece: if it would be true for a different company, it is
core, an extension or a kit; otherwise it is the company's.

## Setting up a factory

One command (`npx software-factory`, to come) opens a setup page in the
browser with two doors:

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

**The factory's files stay on this computer**, in a folder of their own,
outside the code repositories: the company file, the product descriptions,
the knowledge base, the history and the agents' working copies. A backup to a
private repository is an option in the settings, not the default.

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
acme/                    the company's factory, on this computer
├─ factory.json          the company: its products, its kits and add-ons
├─ apps/shop/
│  ├─ product.json       the product described: kind, users, commands
│  └─ BLUEPRINT.md       its structure, promises and checks
├─ services/orders/…
├─ context/              its knowledge base (from the template)
└─ runs/                 its history
```

Today the example company keeps each product's description in the product's
folder. Next, the descriptions move into the factory folder
(`products/<id>.json`), each pointing at the product's code by path or git
address, so an existing codebase needs nothing added to it.

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

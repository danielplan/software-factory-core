# Kobble, the software factory core

Kobble is a software factory: a page on the team's own computer where AI
agents (the kobolds) think through, prototype, build and check changes to a
company's products together with the people who own them. One core,
maintained here, runs a factory for any number of companies. Each company
keeps its own repository with its products and knowledge, and pins a
release of this core.

It grew out of the factory first built for one company. Nothing of that
company is here: only what is true for any company.

## How work flows

```text
  Signals ──▶ Explorations ──▶ Factory ──▶ Done
  what was     an idea worked    the builder     merged, and
  heard        out with the      builds the      every computer
               explorer, tried   agreed card     takes it with
               as prototypes     as a pull       its next update
                                 request
```

- **Signals**: what was learned about the product: from customers, from the
  live app, or from personas (AI testers) sent on missions into the apps.
- **Explorations**: an idea, thought through with the explorer on a canvas.
  Its choices become **prototypes** in the real app, with variants the team
  switches between and tries. The variant they agree on is handed off as a
  card with a spec.
- **Factory**: the board, on GitHub (or Jira). On a GitHub board the builder
  takes cards from To do, builds them test-first in a working copy of its
  own, runs the checks and opens a pull request for review.
- **Home** shows what waits for you; **System** shows the product's parts
  and starts and stops them; **Personas** are the customers the work is for.
- **Sprocket**, the support kobold, answers questions and adds explorations
  and personas from a chat at the bottom of every page.

Kobble speaks English, Italian and German. Each kind of work has its own AI
model, picked in Settings › AI models: talking with you, making prototypes
(Sonnet as standard, for speed) and building.

## Three layers

```text
  PRODUCTS (the company's)   its apps and services, its knowledge, its history
       ▲ the factory reads, prototypes, builds and checks them
       │ each product describes itself (product.json): kind, users, commands
  EXTENSIONS AND KITS (here, versioned)
       core extensions, on by default: Signals, Explorations and their
         prototypes, the Factory board with its builder, Home, System, Personas
       add-ons, chosen per company: trackers (GitHub, Jira), made-up worlds,
         voice, updates, the usage log
       kits, one per kind of product: Expo app, React web app, SvelteKit web app,
         NestJS backend, TypeScript package, other code
       │ use only the core's API
  CORE (here)
       loading products and extensions, parts, settings, agents (Claude Code),
       working copies, the skills, the knowledge base and its checks
```

- **Core** (`packages/core`, `packages/skills`, `packages/knowledge-base`):
  the same in every company and never edited there.
- **Extensions** add abilities to the factory; **kits** teach it a kind of
  product. Both are versioned here; a company chooses which it uses.
- **Products** are what the factory works on. They belong to the company,
  live in its repository and describe themselves; the core finds them.

See [the architecture](docs/architecture.md) for the extension points and how
companies update, [the add-ons](docs/add-ons.md) for the parts a company
chooses from, and [the design system](docs/reference/design-system.md) for how
the dashboard looks and speaks its languages.

## Use it in a project

A project pins a release of the core in its `package.json`:

```json
"devDependencies": {
  "software-factory": "github:danielplan/software-factory-core#release-0.13.0"
}
```

Then, anywhere inside the project:

```sh
npm install
npx software-factory
```

It opens <http://localhost:4300>. Where the project has no factory yet, the
setup coach reads the code and sets the factory up with you; then Kobble opens.
The factory lives in the project, in `factory/`, and the project's `AGENTS.md`
points to it. `npx software-factory upgrade` brings a factory to the pinned
release, and `software-factory new <name>` makes a folder for a new idea and
sets it up there.

To try this working copy instead of a release, run
`node <this folder>/packages/server/bin/software-factory.ts` in the project.

## Kobble builds Kobble

This repository is a product with its own factory, in `factory/`: the
dashboard and the server are its products, and its explorations, board and
prototypes are those of Kobble itself. Run it here like in any project:

```sh
node packages/server/bin/software-factory.ts . --port 4330
```

## Versions and releases

Until 1.0.0 the version is `0.<minor>.<patch>`. A release that a project
takes without doing anything is a patch, new features included. A release
that needs something done (a migration, a new setting format, a removed
command) is a minor. [Releasing](docs/releasing.md) has the rule and the
steps; [the changelog](CHANGELOG.md) says what each version brought. Every
factory looks for a newer release once a day and offers the upgrade as a card
for its builder.

## What is here

| Folder                     | What                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/`           | Product descriptions, the company file, the extension registry, parts, settings groups, recognising products in existing code, making a factory folder, running Claude Code, working copies |
| `packages/kits/`           | React web app, SvelteKit web app, NestJS backend, TypeScript package and Expo app: recognise, start and create each kind of product, with their starters and rules; other code for the rest |
| `packages/launcher/`       | Starts, watches and stops the parts                                                                                                                                                         |
| `packages/server/`         | The local web server and the `software-factory` command: the kobolds, explorations and prototypes, the builder, missions, updates, the trackers (GitHub board, Jira Cloud)                  |
| `packages/dashboard/`      | Kobble's page: the setup flow and the dashboard, in English, Italian and German                                                                                                             |
| `packages/skills/`         | The skills and guides the agents follow, and ground rules for a company                                                                                                                     |
| `packages/knowledge-base/` | The knowledge base's template and its checks                                                                                                                                                |
| `factory/`                 | Kobble's own factory: its products, explorations and board                                                                                                                                  |
| `examples/acme/`           | An example company's factory folder, used by the tests                                                                                                                                      |
| `scripts/`                 | Building and publishing a release; starting Kobble's own prototypes                                                                                                                         |

## Working on the core

Node 24 and npm 11. At the root: `npm install` once (it also sets up the git
hooks), then `npm run verify` for every check. See [AGENTS.md](AGENTS.md).

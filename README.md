# Software factory core

The core of a software factory: AI agents that plan, build, check and record
changes to a company's products with the people who own them. One core,
maintained here, runs a factory for any number of companies. Each company
keeps its own repository with its products and knowledge, and uses a fixed
version of this core.

It grew out of the factory first built for one company. Nothing of that
company is here: only what is true for any company.

## Three layers

```text
  PRODUCTS (the company's)   its apps and services, its knowledge, its history
       ▲ the factory reads, plans, prototypes, builds and checks them
       │ each product describes itself (product.json): kind, users, commands
  EXTENSIONS AND KITS (here, versioned)
       core extensions, on by default: Ideas tab and prototypes,
         the board with its coach and builder, System and Factory tabs
       add-ons, chosen per company: made-up worlds
       kits, one per kind of product: Expo app, React web app, SvelteKit web app,
         NestJS backend, TypeScript package
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
companies update. [The add-ons](docs/add-ons.md) lists the parts a company
chooses from.

## Try it

```sh
npm install
cd ~/code/my-project
node <this folder>/packages/server/bin/software-factory.ts
```

Run it in your project. It opens <http://localhost:4300>: where the project
has no factory yet, the setup page, where the coach reads the code and sets
up the factory with you on a canvas; then the dashboard (System, Products,
Settings). The factory lives in the project, in `factory/`, and the
project's `AGENTS.md` points to it. Run it anywhere inside the project to
open its factory; `software-factory new <name>` makes a folder for a new
idea and sets it up there.

## What is here so far

| Folder                     | What                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/`           | Product descriptions, the company file, the extension registry, parts, settings groups, recognising products in existing code, making a factory folder, running Claude Code, working copies |
| `packages/kits/`           | React web app, SvelteKit web app, NestJS backend, TypeScript package and Expo app: recognise, start and create each kind of product, with their rules; Other code for any other project     |
| `packages/launcher/`       | Starts, watches and stops the parts                                                                                                                                                         |
| `packages/server/`         | The local web server and the `software-factory` command; the trackers' settings (GitHub board, Jira Cloud)                                                                                  |
| `packages/dashboard/`      | The web interface: the setup flow and the dashboard                                                                                                                                         |
| `packages/skills/`         | The skills the agents follow, and ground rules for a company                                                                                                                                |
| `packages/knowledge-base/` | The knowledge base's template and its checks                                                                                                                                                |
| `examples/acme/`           | An example company's factory folder, used by the tests                                                                                                                                      |

Next: drafting each product's blueprint and the knowledge pages from the code
for review, the builder on Jira, the Ideas tab and
prototypes, and an upgrade command.

## Working on the core

Node 24 and npm 11. At the root: `npm install` once (it also sets up the git
hooks), then `npm run verify` for every check. See [AGENTS.md](AGENTS.md).

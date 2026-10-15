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
         GitHub runner, System and Factory tabs
       add-ons, chosen per company: made-up worlds, voice
       kits, one per kind of product: Expo app, React web app, NestJS backend
       │ use only the core's API
  CORE (here)
       loading products and extensions, parts, settings, agents (Claude Code),
       working copies, the method, the knowledge base and its checks
```

- **Core** (`packages/core`, `packages/method`, `packages/knowledge-base`):
  the same in every company and never edited there.
- **Extensions** add abilities to the factory; **kits** teach it a kind of
  product. Both are versioned here; a company chooses which it uses.
- **Products** are what the factory works on. They belong to the company,
  live in its repository and describe themselves; the core finds them.

See [the architecture](docs/architecture.md) for the extension points and how
companies update.

## Try it

```sh
npm install
node packages/server/bin/software-factory.ts
```

It opens <http://localhost:4300>: the setup page, to start something new or
bring existing code, then the dashboard (System, Products, Settings). A new
factory's folder goes in `~/Factories/<company>`; give a folder as the first
argument to open that factory instead.

## What is here so far

| Folder                     | What                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/`           | Product descriptions, the company file, the extension registry, parts, settings groups, recognising products in existing code, making a factory folder, running Claude Code, working copies |
| `packages/kits/`           | React web app, NestJS backend and Expo app: recognise, start and create each kind of product, with their rules                                                                              |
| `packages/launcher/`       | Starts, watches and stops the parts                                                                                                                                                         |
| `packages/server/`         | The local web server and the `software-factory` command; the trackers' settings (GitHub board, Jira Cloud)                                                                                  |
| `packages/dashboard/`      | The web interface: the setup flow and the dashboard                                                                                                                                         |
| `packages/method/`         | The method the agents follow, and ground rules for a company                                                                                                                                |
| `packages/knowledge-base/` | The knowledge base's template and its checks                                                                                                                                                |
| `examples/acme/`           | An example company's factory folder, used by the tests                                                                                                                                      |

Next: drafting each product's blueprint and the knowledge pages from the code
for review, the runner on the GitHub board and Jira, the Ideas tab and
prototypes, and an upgrade command.

## Working on the core

Node 24 and npm 11. At the root: `npm install` once (it also sets up the git
hooks), then `npm run verify` for every check. See [AGENTS.md](AGENTS.md).

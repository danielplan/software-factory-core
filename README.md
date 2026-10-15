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

## What is here so far

| Folder                     | What                                                                                                                        | State         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `packages/core/`           | Product descriptions, the company file, the extension registry, parts, settings groups, running Claude Code, working copies | first version |
| `packages/method/`         | The method the agents follow: the factory loop and its skills, ground rules for a company                                   | first version |
| `packages/knowledge-base/` | The knowledge base's structure and its checks                                                                               | first version |
| `examples/acme/`           | An example company with two products, used by the tests                                                                     | first version |

Next: the launcher and the dashboard shell, then the core extensions (System
and Factory tabs, the GitHub runner, the Ideas tab and prototypes), then the
kits and add-ons.

## Working on the core

Node 24 and npm 11. At the root: `npm install` once (it also sets up the git
hooks), then `npm run verify` for every check. See [AGENTS.md](AGENTS.md).

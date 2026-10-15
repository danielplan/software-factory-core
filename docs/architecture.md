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

## A company's repository

```text
acme/
├─ factory.json          the company: where its products are, its kits and add-ons
├─ apps/shop/
│  ├─ product.json       the product describes itself: kind, users, commands
│  └─ BLUEPRINT.md       its structure, promises and checks
├─ services/orders/…
├─ context/              its knowledge base (from the template)
└─ runs/                 its history
```

The core never names a product. It reads each `product.json` (see
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

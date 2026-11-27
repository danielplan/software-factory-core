# The factory folder

[Knowledge base](../index.md) · [Reference](index.md)

**Type:** Reference · Answers: which files does a company's factory keep in its project, and which of them go into git?

```text
acme/                    the project, one repository
├─ AGENTS.md             the project's rules, pointing to factory/AGENTS.md
├─ package.json          the core pinned, the core's scripts, the team's own
├─ lefthook.yml          the git hooks, written by the core
├─ docs/                 the knowledge base, beside the project's own docs
├─ shop/                 a product's code, with product.json and BLUEPRINT.md
└─ factory/              its factory
   ├─ AGENTS.md          the agents' ground rules and workflow
   ├─ hooks.yml          the team's own git hooks, taken in by lefthook.yml
   ├─ factory.json       the company: its kits, extensions and products' folders
   ├─ board.json         the connected board: label, a column per stage
   ├─ setup.json         the setup conversation and its map
   ├─ team.env           the team's settings, in git
   ├─ home.json          how the team arranged Home (when it did)
   ├─ stages.json        the order of stages the team chose (when it did)
   ├─ theme.css          the look of the company's app (when it has one)
   ├─ extensions/        the team's own extensions, one folder each
   ├─ runs/              its history
   ├─ kobble/            explorations, personas, tests, one file each
   └─ settings/          each person's settings and secrets, not in git
```

The made-up company in `examples/acme/` has this shape and is used by the
tests.

## Products

Each product describes itself next to its code: `product.json` (kind, users,
commands, what it needs and, when its kit cannot tell, its type: screen,
backend, data or outside service) and `BLUEPRINT.md` (its structure, promises
and checks). `factory.json` lists the products' folders from the project's
root, so the project can move as a whole. The core never names a product; it
reads `productSchema` (`packages/core/src/products/product.ts`) and
`companySchema` (`packages/core/src/company/company.ts`).

## Kobble's records

| Records          | Where in `factory/kobble/`                                                                           | In git                         |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| Signals          | `signals/S-0001.json`                                                                                | no: they stay on this computer |
| Explorations     | `explorations/X-1/` (`exploration.json`, `board.json`, `conversation.md`, `pictures/`, `handoff.md`) | yes                            |
| Personas         | `personas/<id>.json`                                                                                 | yes                            |
| Tests            | `tests/T-0001.json`                                                                                  | yes                            |
| Test screenshots | `test-shots/T-0001/`                                                                                 | no: they stay on this computer |

Each record is JSON, checked against its schema
(`packages/core/src/kobble/schemas.ts`) when it is read and written, and
written whole: to a file beside it, then renamed. `software-factory check`
checks these files and what they name. An exploration keeps its own copy of
the signals it heard, so it reads the same on a teammate's computer.

## Settings

The team's settings (the builder's cards at once and model, whether the
usage log is kept, whether the team's own extensions load) are in
`factory/team.env`, which git keeps. Each person's own settings with their
secrets are in `factory/settings/`, which git ignores: tokens, the AI models,
where the usage log is kept. Jira's API token is kept there too; the board
itself is in `board.json`.

## Outside the project

The kobolds' working copies sit next to the project, not in it: the
builder's in `<project>-factory-copies/` and the prototypes' in
`<project>-prototypes/`. A copy that lost its link to git is moved to
`kept/` beside the copies, never deleted. The usage log, when it is on, is
in `<project>-usage/`.

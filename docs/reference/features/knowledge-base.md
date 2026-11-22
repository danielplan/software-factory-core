# The knowledge base

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: what shape does every factory's knowledge base have, and how is that shape kept?

## What it does

Every factory keeps what it knows about the company and its products in the
project's `docs/`: one space with the project's own documentation. It has the
same shape everywhere, this one included:

- an index with a reading order;
- `tutorials/`, `how-to/`, `reference/` (with `features/`, `conventions/`,
  `lessons/`) and `explanation/`, after [Diátaxis](https://diataxis.fr);
- `decisions/`, numbered MADR records;
- `sources/`, original material as it was given, never edited;
- `how-to/maintain-the-knowledge-base.md`, how it is kept.

Every page has a `**Type:** … · Answers: …` line matching its folder, and is
linked from another page. A page says what is true now; the runs say what
happened. The kobolds read it before they work, and the builder brings it in
line with what it built before each pull request.

## How the shape is kept

- **The template** (`packages/knowledge-base/template/context/`) is what a
  new factory starts with.
- **The checks** (`packages/knowledge-base/src/`): links and anchors, paths
  written in backticks, page types, decision records, no orphans, no
  run-diary headings, and the shape itself (`SKELETON` in
  `packages/knowledge-base/src/rules.ts`). A page past 1200 words gets a hint
  to split it.
- **In a company:** `npx software-factory check-docs` runs them on the
  project's `docs/`. The builder runs them before each pull request
  (`knowledgeReport`), so a branch never leaves the knowledge base broken or
  out of shape. The upgrade puts back any page of the shape a project lacks,
  overwriting none (`packages/server/src/upgrade/knowledge-shape.ts`).
- **In this repository:** `npm run check:docs` checks the whole repository's
  links and paths, and `docs/` as a knowledge base (`--knowledge-base docs`).
  `npm run check:docs-follow` fails a branch that changes code and no docs,
  unless a commit says `Docs: none, because …`. Both are in `npm run verify`.

See [decision 0013](../../decisions/0013-knowledge-base-keeps-its-shape.md)
and [maintaining the knowledge base](../../how-to/maintain-the-knowledge-base.md).

## Where it lives

| Part                     | Where                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Template and checks      | `packages/knowledge-base/`                                                                                                     |
| The command              | `packages/server/src/knowledge-check.ts`                                                                                       |
| The builder's round      | `packages/server/src/extensions/factory/builder/knowledge-kept.ts`, `packages/server/src/extensions/factory/builder/checks.ts` |
| The skill that writes it | `packages/skills/skills/update-context/SKILL.md`                                                                               |
| Docs follow the code     | `scripts/docs-follow.mjs`                                                                                                      |

## Checked and not checked

Checked by tests: every rule above (`packages/knowledge-base/test/check-docs.test.ts`),
the builder's round (`knowledge-kept.test.ts`), the shape put back
(`knowledge-shape.test.ts`). The checks cannot tell whether a statement is
still true or said twice: reviewing that is part of every change.

# Kobble's knowledge base

**Type:** Index · Answers: where is the page I need?

Kobble is a software factory that runs on a team's own computer, next to its
code. Signals come in, ideas are explored and prototyped with kobolds (Kobble's
AI agents), and the builder turns the agreed version into a pull request.

This repository is Kobble's core. This knowledge base explains how it is built
and why, the same way every company's factory keeps its own: organised with
[Diátaxis](https://diataxis.fr), four kinds of page, and decisions as numbered
[MADR](https://adr.github.io/madr/) records. A page says what is true **now**.
To add or change a page, follow
[maintaining the knowledge base](how-to/maintain-the-knowledge-base.md).

## New here?

1. Read [what Kobble is](explanation/what-kobble-is.md) and
   [how Kobble is built](explanation/how-kobble-is-built.md).
2. Follow [your first change to Kobble](tutorials/first-change-to-kobble.md)
   once, from a branch to a pull request.
3. Read the [repository's rules](reference/conventions/repository.md) and
   [AGENTS.md](../AGENTS.md).

## Find the right page

| You want to…                                                          | Kind        | Start here                          |
| --------------------------------------------------------------------- | ----------- | ----------------------------------- |
| Learn how a change to Kobble is made, by making one                   | Tutorial    | [Tutorials](tutorials/index.md)     |
| Get a task done: a release, an extension, a code host, a kit          | How-to      | [How-to guides](how-to/index.md)    |
| Look something up: features, plugs, kobolds, the design system, traps | Reference   | [Reference](reference/index.md)     |
| Understand why: how work flows, how the parts fit together            | Explanation | [Explanation](explanation/index.md) |
| See which choices were made, with the options and reasons             | Decision    | [Decisions](decisions/index.md)     |

## The project's own documentation

These pages stay outside this folder and stay the source for what they cover:

- [README](../README.md): what Kobble does and how a company starts with it.
- [AGENTS.md](../AGENTS.md): the rules for anyone working in this repository.
- The blueprints: [the server](../packages/server/BLUEPRINT.md) and
  [the page](../packages/dashboard/BLUEPRINT.md), what each must keep and
  what still differs from its kit.
- The kits' rules: `packages/kits/rules/`, one folder per kind of product.
- The skills and guides the kobolds follow: `packages/skills/skills/` and
  `packages/skills/guides/`.

## Reading order for a new task

1. This index, then the [feature](reference/features/index.md) the task touches.
2. [How Kobble is built](explanation/how-kobble-is-built.md), the blueprint
   of the half you change, and its [conventions](reference/conventions/index.md).
3. The [lessons](reference/lessons/index.md), and any
   [decision](decisions/index.md) the feature page links.
4. The code, starting from the folder the feature page names.

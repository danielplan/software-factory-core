# Personas and missions

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: what is a persona, and how does Mimic try the app as one of them on a mission?

## What it does

A **persona** is one of the real kinds of customer the product is for, with
a name, a place and a few lines about them. The Personas page (`#personas`)
lists them with their signals and adds one. A persona's face (a hat and a
colour) is in its file, or comes from its id.

A **mission** (a persona test) sends **Mimic**, the tester, into the app as
that persona, on this computer only and never the live app.

1. For each persona, a kobold first suggests one mission: a sentence and the
   product to try it in, from who they are, the products with a web address
   and their missions before.
2. The product starts as the factory starts it (two missions needing it at
   once start it once). Mimic sees it only through a browser, Playwright's
   MCP server, headless, with no saved profile.
3. Mimic writes a `Step N: …` line before each step, so the page follows it,
   and keeps a diary: what it did, what it expected, and whether that
   happened.
4. An analyst turns the diary into signals (bug, idea or question, source
   `test`, in the person's words), each with the step where it happened,
   through Signals' plug and its "already" check.

Up to three missions run at once and the others wait; one at a time for each
persona. A mission that cannot run says why: no product with a web address,
the product does not start, no browser, Claude Code missing.

A mission can also run on a prototype's branch, from the exploration's
**Test**: see [prototypes](prototypes.md).

## Rules that must hold

- A mission never touches the live app.
- Only Personas reads and writes the `personas` and `tests` records; others
  use its `personas` and `missions` plugs.

## Where it lives

| Part          | Where                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| The extension | `packages/server/src/extensions/personas/`: `persona-tests.ts`, `mission-ideas.ts`, `index.ts` (its plugs) |
| The skill     | `packages/skills/skills/persona-test/SKILL.md`                                                             |
| The page      | `packages/dashboard/src/extensions/personas/`                                                              |
| The files     | `factory/kobble/personas/<id>.json`, `factory/kobble/tests/T-<n>.json`                                     |

## Checked and not checked

Checked by tests: personas, missions and their queue, mission ideas
(`personas.test.ts`, `persona-tests.test.ts`, `missions.test.ts`). Not
checked by a test: what Mimic finds in a real app.

# Personas

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: what is a persona?

## What it does

A **persona** is one of the real kinds of customer the product is for, with
a name, a place and a few lines about them. The Personas page (`#personas`)
lists them and adds one (New persona asks Sprocket, who adds it with the
team); a persona's page (`#personas/<id>`) shows who they are and, after
launch, the signals from real customers like them. A persona's face (a hat
and a colour) is in its file, or comes from its id.

[Testing](testing.md) sends a persona to live a few days in the app.

## Rules that must hold

- Only Personas reads and writes the `personas` records; others use its
  `personas` plug.

## Where it lives

| Part          | Where                                         |
| ------------- | --------------------------------------------- |
| The extension | `packages/server/src/extensions/personas/`    |
| The page      | `packages/dashboard/src/extensions/personas/` |
| The files     | `factory/kobble/personas/<id>.json`           |

## Checked and not checked

Checked by tests: personas listed, one persona, a new one
(`personas.test.ts`).

# How a TypeScript package is built

The usual way for shared code other products use: types, schemas and rules
in TypeScript, given out as a package. A product may do something its own
way: then its own rule, written in its blueprint, wins over this one.

## What it is for

A package holds what several products must agree on: the shape of the data
they exchange, the rules that must hold the same everywhere, the words they
share. It has no screens, no server and no settings of its own.

## The rules and why

- **One way in:** the package says in its package.json what it gives
  (exports, with their types), and the products import only that, never a
  file inside it.
- **Schemas are the source of the types:** one zod schema per kind of thing,
  with its type inferred from it, so the check and the type never drift.
- **Nothing happens on import:** no reading files, no settings, no network;
  only definitions and functions.
- **Strict TypeScript,** with unchecked index access, and no any.
- **A change reaches every product that uses it in the same piece of work:**
  build the package, then run each user's check. A change that would break
  stored data comes with a migration, or keeps the old shape readable.
- **Small files by subject;** what a product needs alone stays in that
  product.

## The checks

All in the product's verify command; tighten them freely, loosen one only
with the owner's agreement.

| Check                   | What it stops                                       |
| ----------------------- | --------------------------------------------------- |
| The build (tsc), strict | type errors, a package that does not build          |
| The package's own tests | a schema or rule that stopped saying what it should |
| The checks of its users | a change that breaks a product that depends on it   |

## How we test

- Unit tests for every rule and for the schemas' edge cases: what they
  accept, what they refuse and what they say when they refuse.

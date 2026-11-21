# A card gets at most 3 build sessions in a row

## Request

Card [#1 The builder stops on big cards that have no problem](https://github.com/danielplan/software-factory-core/issues/1).

Knowledge base: nothing to change, because the build only changes the limit and the notes of the builder's existing `continue` loop (`packages/server/src/builder/sessions.ts`); no feature page, blueprint promise, convention, design rule or decision describes that loop, and the rule is already written in `packages/skills/skills/factory/board.md` and `CHANGELOG.md`.

Merge with main (2026-11-21): main was already brought in with no conflicts;
nothing left to resolve. `npm run verify` passes in full.

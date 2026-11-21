# Runs are named after their card (card #5)

## Request

Two cards built back to back took the same run number
([card #5](https://github.com/danielplan/software-factory-core/issues/5)).
Agreed in Kobble (exploration X-8): a run is named after its card, only the
factory writes runs, old runs stay.

## Plan and checks

- Skills (`factory`, `update-context`, `board.md`), the agents' template, the
  runs' README, the knowledge base's how-to and the example company say the new
  name: `runs/issue-<card number>-short-name.md`.
- A check before the pull request (`packages/server/src/builder/record-named.ts`,
  wired into `checkWithFixes`): a run the branch adds must carry the card's
  number. Only added files are looked at, so old runs are never flagged.
- Migration 0.14.0 changes `factory/AGENTS.md` and `factory/runs/README.md`.
- Changelog line.

Decisions: the name pattern is `issue-N-` (as proposed, it matches the branch
`factory/issue-N`). Without a board the factory skill asks for one to be
connected before it opens a run. The "run NNN" heading rule stays as it is: it
is only a hint against diary headings.

## Status

done

## Result

`npm run verify` passes. `CORE_VERSION` is raised to 0.14.0 because the migration belongs to a minor release (a company changes files by hand otherwise); the changelog stays under "Unreleased" for the release step. Not checked: that agents follow the new wording; a person checks the names on the next two cards built together.

## Later

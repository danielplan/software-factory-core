# Remake the builder's working copy when its link to git is broken

## Request

Card [#3](https://github.com/danielplan/software-factory-core/issues/3). A copy whose `.git` file points to a missing folder in the project's git store stopped every card with a git error. Agreed (exploration X-9, option A): remake it quietly, keeping the old folder.

## Plan and checks

- `Workspace.ensure()` (`packages/core/src/copies/workspace.ts`) checks that git works in the copy and its top folder is the copy itself; otherwise the folder (if not empty) is moved to `<copies>/kept/<name>-<YYYYMMDD-HHMMSS>`, `git worktree prune` runs in the source, and the copy is added again. A line goes to the server's log.
- Decisions: no `worktree repair` first (a remake covers every cause); a half-made copy (folder without `.git`) counts as broken, an empty folder is used; prototype copies are not covered.
- Found while testing: a card's branch with commits only this computer has was reset to main in a fresh copy (`continuesLocally`). Now it is checked out as it was.
- Checks: `agents-and-copies.test.ts`, "a copy that lost its link to git…": gitdir removed, `.git` pointing nowhere, committed work kept, healthy copy untouched, no copy yet.

## Status

done

## Result

Core tests pass. Knowledge base: nothing to change beyond `docs/architecture.md`.

## Later

- A broken prototype copy (`versionWorkspace`) is not remade.

---
name: upgrade-factory
description: Bring this project's factory to a newer core with `npx software-factory upgrade`, then make the small changes it leaves under "Needs you", check, and hand the result over for review. Use when the person asks to update or upgrade the factory, or when the factory says a newer core is there.
---

The upgrade command does what can be done by code: each release's migrations, the skills, the kits' MCP servers, the version in `factory/factory.json`. What it cannot decide alone it lists under "Needs you". This skill runs it and finishes those, so an upgrade is one request for the person.

## Steps

1. **Look first.** Note what is uncommitted in the project (`git status`): others may be working in this copy. The upgrade only changes the factory's own files (`factory/`, the skills it put in `.claude/skills` and `.agents/skills`, `.mcp.json`, the core's pin in `package.json`, the factory's line in `AGENTS.md` and `CLAUDE.md`); keep it that way.
2. **Newer core, if asked.** The project pins the core in its package.json (`software-factory` in devDependencies, at a `#release-<version>` of the core's repository). For a newer one, set that to the new release (the core's CHANGELOG lists them) and run `npm install`; then say which version it is now.
3. **Run it:** `npx software-factory upgrade`. Read all it says: from which version to which, what it did, what needs you, what the checks find.
4. **Do what needs you**, one line at a time:
   - **Small and clear** (a line to add, a kind to write in a blueprint, a path that moved): do it, in the way the line says, and nothing more.
   - **A choice that is the person's** (a product's purpose or promises, which board or label, switching something on or off): ask, with your recommendation, in plain words; then do what they say.
   - Read the release's section in the core's CHANGELOG when a line needs its reason.
5. **Check again:** run `npx software-factory upgrade` once more: it finds nothing more to migrate and runs the checks. Put right what the checks find, the same way as step 4.
6. **Hand it over.** Say in a few lines which version the factory is on now, what changed (the upgrade's and yours), and anything still open. Show the changed files (`git diff --stat` for the factory's files). Commit only when the person agrees, and only the factory's files, with a message naming the version ("The factory on core 0.3.0").

## Rules

- Never edit the core's own files here, and never undo a migration by hand: a migration that does something wrong is a change asked of the core's maintainer, written without company details.
- Keep the project's own rules, skills and settings as they are; the upgrade only adds to them or replaces what the factory itself put there.
- If the upgrade or a check fails in a way you cannot fix in the factory's files, stop, say what failed and why in plain words, and leave the files for the person to look at.

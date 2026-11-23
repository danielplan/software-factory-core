# Versions

[Knowledge base](../index.md) · [Reference](index.md)

**Type:** Reference · Answers: which number does a release of the core get, and how does a project pin and take one?

## Which number to raise

Until 1.0.0 the core's version is `0.<minor>.<patch>`, and most releases are
patches. The version is `CORE_VERSION` in `packages/core/src/version.ts`.

- **Patch** (0.13.0 → 0.13.1): everything a project can take without doing
  anything: fixes, improvements, and new features too. When the upgrade has
  nothing to leave to the owner, it is a patch.
- **Minor** (0.13.x → 0.14.0): only when a project has to do something to
  upgrade: a migration in `packages/server/src/upgrade/migrations.ts`, a
  settings or data format an older core cannot read, a removed command or
  route, a new step in setup. `npx software-factory upgrade` says what to do.
- **1.0.0**: when a company runs its factory without us helping.

A batch of features is not a reason for a minor. The products a factory
builds follow the same rule, with the first number too: see
[Releases](features/releases.md).

What each version brought is in the commits between its `v<version>` tag
and the one before, and, for the team, in the notes of its GitHub release
(English, with Italian and German folded in), which Settings › Updates
shows ([make a release](../how-to/make-a-release.md)).

## In a project

Setting up the factory pins the core in the project's `package.json`:

```json
"devDependencies": {
  "software-factory": "github:danielplan/software-factory-core#release-0.14.0"
}
```

Everyone with access to this repository then gets it with `npm install`,
and runs `npx software-factory` (the factory, `card …`, `upgrade`). To move
to a newer release: change the tag, `npm install`, then
`npx software-factory upgrade` (the `upgrade-factory` skill does all of it).
A project without a `package.json` installs the same release globally:
`npm install -g github:danielplan/software-factory-core#release-0.14.0`.

Working on the core itself, `npm link` in `packages/server` puts this
working copy's `software-factory` on the computer instead. To try a working
copy in another project, run
`node <this folder>/packages/server/bin/software-factory.ts` there.

How a release is made: [make a release](../how-to/make-a-release.md).

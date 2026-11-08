# Releasing the core

How a version of the core reaches the companies' projects. A project
installs the core straight from this repository, at the tag of a release,
and pins it in its `package.json`; `software-factory upgrade` brings its
factory to that version.

## Making a release

1. Every change a company would have to make by hand has its migration in
   `packages/server/src/upgrade/migrations.ts`, for this version.
2. Raise `CORE_VERSION` in `packages/core/src/version.ts`.
3. In `CHANGELOG.md`, turn "Unreleased" into the version's section, with
   the date and how to upgrade.
4. `npm run verify`, commit, and tag the commit on main `v<version>`.
5. `npm run release -- --push`: builds the core as one package (compiled to
   JavaScript, its own packages bundled in it, the dashboard built), commits
   it to the `release` branch and tags it `release-<version>`, then pushes
   the branch and the tag. Without `--push` it stops before pushing.

The build is `scripts/build-release.mjs`, the publishing
`scripts/publish-release.mjs`; the release branch's working copy is
`.release/`, made the first time.

## In a project

Setting up the factory pins the core in the project's `package.json`:

```json
"devDependencies": {
  "software-factory": "github:danielplan/software-factory-core#release-0.3.0"
}
```

Everyone with access to this repository then gets it with `npm install`,
and runs `npx software-factory` (the factory, `card …`, `upgrade`). To move
to a newer release: change the tag, `npm install`, then
`npx software-factory upgrade` (the `upgrade-factory` skill does all
of it). A project without a `package.json` installs the same release
globally: `npm install -g github:danielplan/software-factory-core#release-0.3.0`.

Working on the core itself, `npm link` in `packages/server` puts this
working copy's `software-factory` on the computer instead.

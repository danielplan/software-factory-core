# Prototypes that start without a setup (card #50)

## Request

[Card #50](https://github.com/danielplan/software-factory-core/issues/50),
agreed in exploration X-17 (prototype `proto/X-17-b`, variant D): when a
project has no start command, Tinker works one out while making the first
prototype, checks that it starts, and keeps it for the whole team. The owner
never sees the red box about `factory.json`. Only when Tinker cannot get the
app to start, a calm grey box says so, with **Try again**.

## Plan and checks

Built from variant D of the prototype (its line, its calm box, its look);
variants B and C (the red box, the kobold button, the steps and message), the
variant switch and the made-up start are left out.

Server:

1. `prototype.by: "tinker"` in the company file marks a start Tinker worked
   out (the start lives where it already did: `factory.json`,
   `prototype.start`). A start without the mark is the team's and is never
   changed.
2. `start-setup.ts`: Tinker (guide `packages/skills/guides/prototype-start.md`)
   proposes `Start: <command>`; `PrototypeMode.trial` runs it in the copy and
   checks it prints `FACTORY_URL=…` and that the address answers; only then
   it is kept. Up to three tries, each told what the last printed; else
   Tinker's own `Could not start:` reason.
3. `starting-up.ts`: when a prototype is made (making.ts) or opened
   (Start / Try again) in a project with no start command, the start is
   worked out first (one at a time); the prototype it was worked out for is
   marked `startSetUp`; a start Tinker worked out that fails when a
   prototype starts is worked out again, once.
4. `VersionRun.startProblem` carries Tinker's reason (empty: none of its own);
   the starting steps get a `setup` step.

Page: `board/start-setup.tsx` (the line, the calm box with Try again), shown
from `startSetUp` and `startProblem`; words in en/it/de.

Checks: `packages/server/test/prototype-start-setup.test.ts` (answer reading,
the guide's rules for logins, trial, retries and reason, first prototype only
carries the line, failure and Try again, kept start noticed when it stops,
team's start left alone); the existing exploration tests now name a start
command (or none, with Tinker unable to work one out).

Decisions (cheap to change, so decided here):

- **Where "the line was already shown" is remembered:** on the prototype
  itself (`startSetUp` on its board thing), so it survives restarts and shows
  on exactly the prototype the start was set up for.
- **How many tries:** three.
- **How a stopped-working start is noticed:** when a prototype starts with a
  Tinker-made start and fails, Tinker works it out again once, told the old
  command and what it printed.
- **Starting by itself on opening a page** stays only where a start command
  exists (`canRun`), so opening a page never starts a Tinker run.
- The `.playwright-mcp/` snapshots and unrelated changes on the prototype
  branch are not brought in.

## Status

in progress: server, page, words, tests and docs built; checks and
screenshots remain.

## Result

(to fill in)

## Later

- A persona test in a project without a start waits for the set-up to finish.

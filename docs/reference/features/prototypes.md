# Prototypes and made-up worlds

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md) · [Explorations](explorations.md)

**Type:** Reference · Answers: how does Tinker make an exploration's prototype in the real app, with variants and states, and what data does it run on?

## What it does

**Tinker**, Doodle's maker, builds an exploration's prototype in the real
app. Doodle starts it itself (`make_prototype`); there is no button.

- **One prototype per exploration**, on its branch `proto/X-<n>-<key>`, in
  its own copy of the code in `<project>-prototypes/`.
- **Variants:** the options, four at most, switched outside the app through
  the page address (`?variant=B`). Each variant may show its **states**
  too (empty, loading, a problem, many items: `?state=<name>`).
- Doodle asks for a change (`change_prototype`), another way
  (`another_way`) or, once the team picks one variant, new variants refining
  it (`dig_deeper`).
- Tinker reads the product's design system, keeps one conversation per
  prototype, adds the made-up data the change needs, looks at pictures of
  what it made (`look_at_prototype`) and clicks once through it. It runs no
  rounds of checks. Doodle reviews the pictures and Tinker's words for the
  team.
- The prototype runs while it is made, starts again once Tinker is done, and
  opens on the page the change is on.
- Opening an exploration starts its prototype by itself (the agreed one,
  otherwise the newest) when none runs, only where the project names a
  prototype start command (`canRun` on the exploration's page); without one
  nothing is asked, and **Open** says why it cannot run.
- A version's copy starts from origin's base branch, or from this
  computer's own when the project has no origin yet (a new project, a demo
  copy).
- When a prototype cannot be made, Doodle is told why at once and says so
  in plain words, never that Tinker is still on it, and offers to make it
  again or hand off from the agreed picture.
- A restart of the factory while Tinker is at work does not lose the
  prototype: what Tinker was asked and its conversation are saved beside
  the copy as it starts, and when the factory starts again it picks Tinker
  up in the same copy and conversation, told to look at its uncommitted
  edits and carry on (`cut-off.ts`).
- The branch is pushed to origin once committed, so a teammate's computer
  opens it too; when it cannot be, the board says it is only on this
  computer. **Open** runs it with the product's prototype command, one at a
  time; **Test** sends a persona on a mission on that branch.

A kit gives the prototype mode and the starter for a brand-new app. The React
web app and Expo app starters have the prototype mode, the shared world's
hook and a check that no prototype code reaches the real app; the React web
app's also clicks through its built prototype with Playwright. The NestJS
backend's starter keeps the made-up world: a `prototype-world/` folder of
situations written as its tables, checked against its schema
(`npm run check:world`) and written into its test database by its
integration tests.

## Made-up worlds

A product may name a folder of situations as its `world` in `product.json`
(`<key>.json`: `name`, `about`, `clock`, `signed_in`, `tables`), and a
`checkWorld` command that checks them against its own schema
(`software-factory check` runs it).

Each exploration's prototypes share one world, kept as `world.json` beside
the exploration. It starts from the first situation, or from a persona's
when a mission or a prototype opened for it starts it, with every time moved
to now. It is versioned: a change made on an older version is refused. The
prototypes' start command gets `FACTORY_WORLD_URL`, where they `GET` the
world and `POST` changes, so tabs and devices share it live. Doodle can look
at the world and change it (`look_at_world`, `world_rows`, `change_world`,
`use_situation`). The example company's Orders service has three situations.

## Rules that must hold

- No prototype code reaches the real app.
- A prototype is handed off only when agreed, with its variant
  ([decision 0003](../../decisions/0003-build-from-the-agreed-prototype.md)).
  A prototype the team does not want built (a broken first version, say) is
  taken off the board by Doodle, on their word: never one that is agreed
  (it is marked a sketch first) or being made. Its branch stays. A board
  with a prototype nobody agreed on and nobody took off is not handed off.

## Where it lives

| Part       | Where                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tinker     | `packages/server/src/extensions/explorations/`: `prototypes.ts`, `making.ts`, `cut-off.ts`, `maker-tools.ts`, `looks.ts`, `versions.ts`                                        |
| The worlds | `packages/server/src/extensions/explorations/`: `worlds.ts`, `world-tools.ts`, `world-route.ts`; `packages/core/src/kobble/world.ts`, `packages/core/src/kobble/situations.ts` |
| The copies | `packages/server/src/prototypes/`                                                                                                                                              |
| The skill  | `packages/skills/skills/explore/SKILL.md`                                                                                                                                      |
| The page   | `packages/dashboard/src/extensions/explorations/board/` (the prototype's card)                                                                                                 |

## Checked and not checked

Checked by tests: prototypes, their copies and states, versions, digging
deeper, worlds, picking up a maker after a restart. Not checked by a test: how good a prototype looks; Tinker
looks at its pictures and Doodle reviews them.

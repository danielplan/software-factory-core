# The kobolds

[Knowledge base](../index.md) · [Reference](index.md)

**Type:** Reference · Answers: which kobolds are there, what does each do, which extension brings it, and where are its guide and tools?

A kobold is Claude Code running on this computer with a guide and tools of
its own. Each is brought by an extension (`brings.kobolds`), except Sprocket,
which is the core's. Their names, hats and colours are in
`packages/dashboard/src/lib/kobolds.ts`; how they are drawn is in
[the design system](design-system.md#faces).

| Name     | Job                                                      | Id         | Brought by   | Hat             | Guide or skill                                | Its tools                                                                          |
| -------- | -------------------------------------------------------- | ---------- | ------------ | --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Sprocket | the guide, at the bottom of every page                   | `support`  | the core     | blue floppy cap | `packages/skills/guides/support-kobold.md`    | `go_to`, and the hand-offs the installed extensions plug in                        |
| Doodle   | the explorer, on an exploration's whiteboard             | `explorer` | Explorations | beret           | `packages/skills/guides/exploration-coach.md` | the board's tools (`packages/server/src/extensions/explorations/board-tools.ts`)   |
| Tinker   | Doodle's maker, who builds the prototype                 | —          | Explorations | toque           | the `explore` skill                           | `look_at_prototype` (`packages/server/src/extensions/explorations/maker-tools.ts`) |
| Bolt     | the builder, who builds the cards in To do               | `builder`  | Factory      | trucker cap     | the factory skill's `board.md`                | the project's own, in a copy of its own                                            |
| Mimic    | the tester, who lives a few days in the app as a persona | `tester`   | Testing      | cap             | the `persona-test` skill                      | a browser (Playwright's MCP server)                                                |
| Sieve    | the sorter of what comes in                              | `sorter`   | Signals      | headphones      | —                                             | —                                                                                  |

The skills are in `packages/skills/skills/`. A team can give its factory's
kobold its own name; Sprocket then carries it (`packages/dashboard/src/lib/brand.ts`).

## What each may do

- **Sprocket** reads the project and changes no file. It hands work on, and
  never does a kobold's work itself
  ([decision 0010](../decisions/0010-sprocket-is-the-guide.md)).
- **Doodle** changes only its exploration's board, and asks Tinker for the
  prototype. It thinks first and draws one living picture
  ([decision 0005](../decisions/0005-whiteboard-not-pipeline.md)).
- **Tinker** works in the prototype's own copy of the code, on its branch.
- **Bolt** works in its own copies (`<project>-factory-copies/`), on the
  card's branch, and pushes only work whose checks pass
  ([decision 0007](../decisions/0007-push-only-passing-work.md)). It never
  merges.
- **Mimic** uses the app only through a browser, on this computer, never the
  live app.
- **Sieve** today only matches the feedback board's posts to personas; the
  "already" check for new signals is a plain rule
  (`packages/core/src/kobble/already.ts`).

## Without a face

Some kobold runs have no face: the setup coach
(`packages/skills/guides/setup-coach.md`), the spec writer that writes the
hand-off card (`packages/skills/guides/handoff-spec.md`), the analyst that
turns a test's diary into signals, and the judge that suggests a release's
number. There is no
planner ([decision 0002](../decisions/0002-no-planning-stage.md)).

## The models

Settings › AI models chooses which model does which job: one for talking
with the team, a faster one for making prototypes, and one for the builder.
The talking kobolds think before they answer (Thinking before talking).

# The kobolds

[Knowledge base](../index.md) · [Reference](index.md)

**Type:** Reference · Answers: which kobolds are there, what does each do, which extension brings it, and where are its guide and tools?

A kobold is Claude Code running on this computer with a guide and tools of
its own. Each is brought by an extension (`brings.kobolds`), except Sprocket,
which is the core's. Their names, hats and colours are in
`packages/dashboard/src/lib/kobolds.ts`; how they are drawn is in
[the design system](design-system.md#faces).

| Name     | Job                                          | Id         | Brought by   | Hat             | Guide or skill                                | Its tools                                                                          |
| -------- | -------------------------------------------- | ---------- | ------------ | --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Sprocket | the guide, at the bottom of every page       | `support`  | the core     | blue floppy cap | `packages/skills/guides/support-kobold.md`    | `go_to`, and the hand-offs the installed extensions plug in                        |
| Doodle   | the explorer, on an exploration's whiteboard | `explorer` | Explorations | beret           | `packages/skills/guides/exploration-coach.md` | the board's tools (`packages/server/src/extensions/explorations/board-tools.ts`)   |
| Tinker   | Doodle's helper, who builds the prototype    | —          | Explorations | toque           | the `explore` skill                           | `look_at_prototype` (`packages/server/src/extensions/explorations/maker-tools.ts`) |
| Bolt     | the builder, who builds the cards in To do   | `builder`  | Factory      | trucker cap     | the factory skill's `board.md`                | the project's own, in a copy of its own                                            |
| Mimic    | the tester, who plays a persona on a mission | `tester`   | Personas     | cap             | the `persona-test` skill                      | a browser (Playwright's MCP server)                                                |
| Sieve    | the sorter of what comes in                  | `sorter`   | Signals      | headphones      | —                                             | —                                                                                  |

The skills are in `packages/skills/skills/`. A team can give its factory's
kobold its own name; Sprocket then carries it (`packages/dashboard/src/lib/brand.ts`).

## Meeting them on the page

People meet the team without asking who is who
(`packages/dashboard/src/components/meet/`):

- **A name tag where a kobold works**: its face, "Tinker · Doodle's helper"
  and under it, in grey, what it does and what that means for you ("Making
  variant A to try · about 2 min · nothing to do until it's ready"). Tinker's
  is on a prototype card being made, Bolt's on a Factory card being built,
  Mimic's on a persona test, Sieve's on the Signals page. Doodle's chat
  header and Sprocket's bar show a face with name and role always written.
- **Your kobolds** in the sidebar, on every page that has one: each
  kobold's face, name and a live line, "Resting" when it has none; Tinker
  under Doodle, only while it works.
- **The panel**: any face, tag or row of the sidebar's group opens it, the
  kobold you came from lit. Sprocket is on top; below are Sieve, Doodle,
  Tinker, Bolt and Mimic. A kobold at work moves in its own way and says what
  it does now; a resting one sleeps. Clicking one opens its card: its job,
  where it works (a link) and what it did last. Nothing moves when the
  computer asks for calm.

Each extension says what its kobolds do through its page module's `Watch`
(`packages/dashboard/src/lib/page-module.ts`): a component that draws
nothing and reports a live line and what it did last
(`packages/dashboard/src/lib/meet.ts`). The frame adds what it knows itself
(Sprocket, Doodle, Bolt) and shows it everywhere, so no extension reaches
into another. How the lines are worded is in
`packages/dashboard/src/lib/meet-view.ts`. Doodle calls Tinker "my helper"
to the team (its guide, `exploration-coach.md`).

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
turns a mission's diary into signals, the judge that suggests a release's
number, and the one that suggests a mission for a persona. There is no
planner ([decision 0002](../decisions/0002-no-planning-stage.md)).

## The models

Settings › AI models chooses which model does which job: one for talking
with the team, a faster one for making prototypes, and one for the builder.
The talking kobolds think before they answer (Thinking before talking).

# Testing

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how does Mimic test the app by living a few days in it as one of the personas?

## What it does

A **test** sends **Mimic**, the tester, to live a few days in the app as one
persona, the way a real customer would, on this computer only and never the
live app. Bugs and ideas come out of the same days.

1. **The story and the days.** On New test (`#testing/new`) the team picks
   a persona. Mimic writes the test: its name, the persona's story (who they
   are, how they work without the app, why they try it, when they would give
   up) with **what they bring** (their customers, prices, a list they would
   paste), one to three days of situations that happen to them ("9:00 A
   client asks for a quote"; the first day, when the app is new to them, is
   setting it up), the app to use, and their language and time zone. The
   team changes any of it, then sends them off. Nothing is kept before.
2. **Living the days.** The product starts as the factory starts it (two
   tests needing it at once start it once). Mimic sees it only through a
   browser, Playwright's MCP server, headless, with no saved profile, in the
   persona's language and time zone. It lives one day at a time, knowing
   what it did on the days before, writes a `Step N: …` line before each
   step so the page follows it, and keeps a diary of each moment: the time,
   what it did, what it expected, whether that happened, what the persona
   said, and a screenshot. When the persona cannot go on, as the person
   would not (no way in, nothing works), the day ends as **stuck** and the
   days after are not lived. What the browser's console reports as errors
   is kept, day by day.
3. **The findings.** An analyst turns the whole diary into signals (bug,
   idea or question, source `test`, in the person's words), each at the
   moment where it happened, through Signals' plug and its "already" check.
   The browser's errors back a bug up where the diary shows it.

The Testing page (`#testing`) lists the tests, newest first, with their
persona, days, a bar per moment (went fine, not as expected with nothing
filed, idea, question, bug) and what
they found; with none yet, it shows the personas to pick one. A test's page
(`#testing/<test>`) shows the story's first paragraph (the rest on request)
and each day as a strip of moments, with the screenshot, the persona's words
and what was filed there, the browser's errors, and where they got stuck. **Test again**
starts a new test for the same persona.

Up to three tests run at once and the others wait; one at a time for each
persona. A test that cannot run says why: no product with a web address,
the product does not start, no browser, Claude Code missing.

A prototype's **Test**, in an exploration, starts a test of one day on the
prototype's branch through Testing's plug: see [prototypes](prototypes.md).
Sprocket can start a test too (`start_test`).

## Rules that must hold

- A test never touches the live app.
- Only Testing reads and writes the `tests` records; others use its `tests`
  plug. Who is tested comes from Personas' plug.
- The screenshots stay on this computer (`factory/kobble/test-shots/`, named
  in the factory's `.gitignore`).
- A test written before tests had days (one task) reads as one day with that
  task as its only situation.

## Where it lives

| Part          | Where                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| The extension | `packages/server/src/extensions/testing/`: `runs.ts`, `prompts.ts`, `new-test.ts`, `index.ts` (its plug) |
| The skill     | `packages/skills/skills/persona-test/SKILL.md`                                                           |
| The page      | `packages/dashboard/src/extensions/testing/`                                                             |
| The files     | `factory/kobble/tests/T-<n>.json`, `factory/kobble/test-shots/T-<n>/`                                    |

## Checked and not checked

Checked by tests: the story and days, a test through its routes, the queue,
the days in order with their screenshots, old tests, the browser's options
(`testing.test.ts`, `test-runs.test.ts`). Not checked by a test: what Mimic
finds in a real app.

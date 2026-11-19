# Signals from AI testers

## Request

Card [#10 Signals from AI testers](https://github.com/danielplan/software-factory-core/issues/10).

Before launch there are no customers, so the Signals page is empty: the live
export has nothing to send and no persona test has run. Before launch, a
signal is something learned while building that might change what we build.
The team sends AI testers (the personas) into the apps: each persona tries
its own app, with a mission the kobold suggests, and what they run into comes
back as signals (bug, idea, open question), each linked to the step where it
happened. Several can run at once. Connecting the live app becomes a small
line for later.

Agreed: **A2 · One suggested mission** (prototype on `proto/X-1-a2`,
exploration X-1).

Where things stand (main, core 0.11.x): persona tests exist (Personas →
a persona → Tests tab), one at a time in a queue, run on the first product
with a web address; the analyst files `bug` or `feedback`; the empty Signals
page only offers to connect the live app.

## Plan and checks

What people see (as in prototype A2):

1. **Signals, empty, before the live app is connected:** a calm picture (the
   personas' face tiles beside a plain app screen), one sentence ("No
   customers yet. Send your personas to try the app, and what they find shows
   up here."), one button to Personas, and a small line "After launch,
   connect <app> to hear from customers" that opens today's connect card.
   Signals from missions show in the usual Signals list, with the step where
   each happened.
2. **Personas:** cards in a grid with face, name and description, read only;
   a card opens the persona's page. **Send everyone** at the top sends each
   persona not on a mission yet with the kobold's suggestion.
3. **A persona's page:** who they are (and which app they use), then **Send
   on a mission**: the mission the kobold suggests, marked _Suggested_ with
   the kobold's face, **Send <name>** and **Change** (once the words are
   changed, the badge goes). Then one list **Missions**, newest first: the
   one running on top with its quiet progress ("Step 3: choosing a delivery
   slot"), then each past one with its date, its words and the signals it
   found (bug, idea, open question), each at its step, linking to Signals.
   No tabs. Signals from real customers (not from missions) show under
   "From real customers" only when there are any.
4. A mission's own page (what the kobold did, step by step) stays, reached
   from the list.

Underneath:

- **Signal kinds** `idea` and `question` (open question) join bug, request
  and feedback; missions file bug, idea or question.
- **The step** a signal happened at is kept on the signal (`step`: the
  mission, the step's number and what the persona did there).
- **Several missions at once:** each starts right away, at most 3 at a time
  (the rest wait); one at a time per persona (a second is refused while one
  runs).
- **The kobold suggests a mission** for a persona from who they are and the
  apps there are: one sentence and which app (product). Kept in memory on
  the server until a mission is sent, then a new one is asked for.
- **Each persona tries its own app:** a mission records the product it ran
  on; the factory starts that product. A product started by two missions at
  once is started once.
- **"Tests" are called missions** in everything people see. The records
  keep their names (`kobble/tests/T-0001.json`), so no file moves and no
  migration.

Checks: server tests for several at once, one per persona, the step and the
kinds, the suggestion; dashboard view tests for the words; the full
`npm run verify`; screenshots of the three pages with the example company.

Decisions taken while building (cheap to change later):

- At most 3 missions at a time: each is a browser and a Claude Code session
  on the owner's computer; more would slow it down for little gain.
- Progress shows "Step N: <what it is doing>" without a total: the persona
  agent does not know in advance how many steps it will take. It writes a
  line per step as it goes, which the factory reads while it runs.
- The suggestion is not saved in the persona's file: it is a draft, and a
  persona's file is shared with the team through git.
- Records keep the name `tests` (see above).

Later (not in this card): missions again after each merge.

## Status

in progress

## Result

## Later

- Missions again after each merge (agreed for later on the card).

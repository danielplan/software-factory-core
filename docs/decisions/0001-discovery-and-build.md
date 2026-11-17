---
status: proposed
date: 2026-11-17
decision-makers: the maintainer
---

# Discovery and Build: two loops over one set of records

[Decisions](index.md)

## Context and Problem Statement

Kobble has three product pages: Understand (who the product is for and
where it breaks), Explore (ideas and their versions, in prototype mode) and
Build (the board, with the coach and the builder). They follow one stage
vocabulary, from a problem heard to solved.

Two different questions are mixed in that one line:

- **Discovery**: what should we improve, and why? It ends in something
  learnt, even when the answer is "no".
- **Build**: how do we change the product safely and correctly? It ends in
  software that is checked and in the app.

Today an idea goes to Build with the version that has the most picks. Picks
say what the team likes; they do not say whether the idea holds. A
prototype is not an experiment until it says, before anyone tries it, what
would show that it works. And a known bug or a small change should not have
to go through Discovery at all: it already can (a fix or an update from
Understand, or a card on the board), but the dashboard does not say that
these are two ways in.

How should the factory show and record the two, without breaking the
records, the board or what companies already rely on?

## Considered Options

1. Keep one pipeline, as today.
2. Two applications, or two servers: one for Discovery, one for Build.
3. Two loops in the same factory, over the same records, joined by one
   explicit decision to build, and the board unchanged.

## Decision Outcome

Proposed: option 3, in four steps, each released on its own and each
leaving what came before working.

1. **Show the two loops** (done in the release after 0.10.0). The sidebar
   groups Understand and Explore under Discovery, and Build under Build.
   Today becomes Overview: the product at a glance, both loops' numbers,
   and the one next step that most needs a person. Addresses, records and
   the board are unchanged.
2. **What a version tests, and what was learnt.** A version may say what
   it tests (`hypothesis`: "people like Mia will pay at night if …") and,
   before anyone tries it, what would show that it holds (`expect`). A new
   record, the **learning**, says what was learnt from an idea's versions:
   held, did not hold, or unclear; the signals that show it (never persona
   runs, as today); its limits; and what comes next (build, another
   version, look elsewhere, nothing). A learning that says "did not hold"
   is kept: it is knowledge too. The kobold drafts learnings; a person
   confirms them, as with everything it writes.
3. **An explicit decision to build.** Send to Build asks a person for a
   reason: a learning that held, or, for a small change with little risk,
   a line saying why no test was needed. Picks stay, as one input to that
   decision. The reason goes into the issue's text and the ticket link.
4. **Two ways into Build, one board.** Work from Discovery and work asked
   for directly (a bug, a new feature, an improvement, maintenance) both
   land in Backlog, as today. The board keeps its columns; on the Overview
   and in the docs they are read as Analyze (Backlog, Planning), Plan
   agreed (To do), Implement (In progress), Verify (Review) and Deliver (In
   the app). "Did it work?" stays the outcome after release, apart from
   Discovery's learning before it.

### Consequences

- Good, because a person sees which question they are answering, and the
  board, the kanban everyone already uses, stays as it is.
- Good, because a "no" from a test is kept and can stop an idea before
  anything is built.
- Good, because each step is small: step 2 adds one kind of record (its
  own table, made like the others) and optional fields on a version, so
  older records still fit; the tables version goes to 2 and an older core
  refuses the newer database rather than changing it (from this release).
- Bad, because sending to Build asks for one more line from a person.
- Bad, because the kobold's `explore` skill, the seed of the example
  company and the docs all change in step 2, and every company gets them
  with `software-factory upgrade`.

### Confirmation

Each step comes with its tests (the core's `derive` and `check` for the
records, the dashboard's view tests for what pages say), a line in the
changelog, and a migration where a company has something to change.

### Later steps, from a second concept

A concept for the same kind of tool, read on 2026-11-17, follows the same
loop (what comes in, a plan, prototypes, the factory) and agrees with this
decision. Two of its ideas came in at once, as they change no records:
every new signal can be fixed, explored or dismissed in one click, saying
first when the same thing is already explored or fixed; and Explore lists
the ideas by step (plan, prototypes, handed off, dropped). Four more are
next steps, each its own decision when it comes:

- **Testing as a persona.** The kobold uses a prototype, running on this
  computer, as one persona would, and notes where it gets stuck, on the
  version. It needs a browser the kobold drives, and its runs stay persona
  runs: never evidence that a problem is real.
- **A persona's tests.** On a person's page, beside what people like them
  said, the tests the kobold ran as them.
- **Signals that come in by themselves.** A connector (an extension point,
  like the trackers) that reads a product's own feedback, errors and usage
  every few minutes, anonymised before it leaves the product, into
  `POST /api/signals`.
- **Records as files in git.** The records kept as small files beside the
  code, so the team shares them through git, with the database rebuilt
  from them on each computer, as the architecture already plans.

## More Information

This answers [an architecture review](../sources/2026-11-17-architecture-review.md),
which also looked at the core's safety. What was
done, and what was looked at and left on purpose, is in
[the security notes](../../SECURITY.md).

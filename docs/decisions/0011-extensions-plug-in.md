---
status: accepted
date: 2026-11-22
decision-makers: the maintainer
---

# Extensions never talk to each other; they plug in

[Knowledge base](../index.md) · [Decisions](index.md)

## Context and Problem Statement

Kobble's own pieces (Factory, Explorations, Signals, Personas, Releases)
became extensions a team can install and remove. Their code still reached
into each other's records and functions, and the core named them: the
session read the board's work, setup wrote personas and explorations, the
feedback board wrote signals. Removing one would break others. How do
extensions work together?

## Considered Options

- Extensions call each other, and check first whether the other is
  installed.
- An event bus every extension listens to.
- Extensions meet only at plugs the core defines, and each owns its records.

## Decision Outcome

Chosen: plugs. The core defines the plugs (`ideas`, `signals`, `personas`,
`missions`, `work`, `home`, `support`) and the slots (`code`, `tasks`). Each
extension is one module, its declaration and `serve(host)`, and offers its
plugs from its own code; another reaches one through `host.plug(name)`,
which is `null` while the offering extension is not installed. Each
collection of records belongs to one extension, which alone reads and writes
it. `needs` says only what must be installed with an extension, never
something to call. Removing an extension takes away everything it plugged
in, and nothing else breaks.

### Consequences

- Good, because any extension can be removed, and its absence is one case,
  `null`, handled where the plug is used.
- Good, because dependency-cruiser and the records test check it.
- Bad, because a plug is one more type to write when two extensions need
  each other.

## More Information

[Extensions and plugs](../explanation/extensions-and-plugs.md),
[plugs and slots](../reference/plugs-and-slots.md).

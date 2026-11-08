---
name: factory
description: Set the scene and route software requests through planning, building, reviewing, showing and remembering. Use when the person invokes $factory or asks to build or change something here.
---

Factory sets the scene and routes the next move through the skills. It is the entry point for a request, and it coordinates the work of the other skills. It reads the request, the relevant context and the state of the products, and opens a conversation with the person to clarify the goal, scope and next move.

## Approach

Read the company's instructions (`AGENTS.md`), the relevant knowledge (start at `docs/index.md`) and the current state of the products involved. Each product describes itself in its own folder (`factory/factory.json` lists them): its `product.json` (name, kind, who uses it, its commands) and its `BLUEPRINT.md` (kind, structure, promises, checks). If the request could change more than one product, ask which one before planning.

Start a new run in runs/NNN-short-name.md, numbered after the last one, with the following sections:

- **Request**: the request and any relevant context, including the current state of the products.
- **Plan and checks**: the agreed scope, the plan to implement it, and the checks to verify it, as they stand now: short enough to read in one go. Include the relevant trade-offs and decisions. What was tried and dropped on the way goes under a heading **Tried** at the end of this section, each with why, so the agreed plan stays readable.
- **Status**: the current status of the run, including what has been done, what is in progress, and what remains to be done. Update this section as the run progresses. Use the following status values: `not started`, `in progress`, `done`, `blocked`, `stopped`.
- **Result**: the result of the run, including any relevant output, logs, or artifacts. Update this section as the run progresses.
- **Later**: any relevant notes, ideas, or follow-up work that may be useful in the future. Update this section as the run progresses.

Use the following skills to create the run and manage its progress:

- **Plan the run → [`plan`](../plan/SKILL.md).** It clarifies the request, scope, plan and checks with the person. It may return to the person for decisions or to clarify the request.
- **Implement → [`build-test-first`](../build-test-first/SKILL.md).** It implements the agreed scope and checks correctness.
- **Review completed code → [`review-structure`](../review-structure/SKILL.md).** After substantive implementation and its checks, reconsider the affected structure and useful official ecosystem skills. Skip documentation-only changes; optional recommendations do not hold up working scope.
- **Once it is ready → [`show-result`](../show-result/SKILL.md).** It runs the result, provides a useful way to try it and reports the limits of verification.
- **Update knowledge about the products → [`update-context`](../update-context/SKILL.md).** It updates the knowledge base and the blueprints from what actually happened.

Read each skill when you need to use it. Each skill has its own instructions and approach.

**Committing a run.** Commit the run file when its plan is agreed (with the card's agreement, when it has one) and again when the run ends (`done` or `stopped`), with only the run's own files. A run left uncommitted is history nobody else can read.

## What you notice along the way

When you notice something outside the current work (a bug, a missing check, a rough edge, an idea), don't fix it silently and don't let it go. Say it to the person in a line and propose a card. With their yes, look on the board for a card that already covers it (`npx software-factory card list`), then make one: `npx software-factory card new "<title>" --body-file <file> --found-while <number>` (the card you are working on, when there is one; it links both ways). Without a board, it goes under the run's **Later**.

When the person asks to update the factory itself to a newer core, use [`upgrade-factory`](../upgrade-factory/SKILL.md) instead of a run.

## Work from the board

When the factory is connected to a board, work lives there: anyone adds cards to its backlog, and the factory's builder builds the cards that are ready, on the computer where the factory is open with its builder switched on (the Board tab). The coach can plan cards in their comments there too; how both work through the board is in [board.md](board.md). In the project, the `npx software-factory card` command reads and moves them (`npx software-factory card help` lists what it does).

- **Pick the work:** `npx software-factory card list` (or `list backlog`) shows the cards; `card show <number>` one card, with its comments. When the person brings a new request that belongs on the board, make it a card first: `card new "<title>" --body-file <file>`.
- **Plan it here:** move the card to planning (`card move <number> planning`), open the run for it (its Request links the card), and plan it with the person with [`plan`](../plan/SKILL.md), prototypes included ([`prototype`](../prototype/SKILL.md) says how to make and run one).
- **Relations between cards:** `card depends <number> --on <number>` when a card can only be built after another; `card replace <number> --by <number>` when another card does it now (it is closed with a note on both, so it stays findable; delete a card only when the person asks). `card show` lists a card's relations, `card list` marks the cards that wait, and the builder doesn't start a card before the cards it depends on are done.
- **Hand it on:** once the person agrees to the plan, `plan` writes it into the card and moves the card to ready. Then stop: the builder builds it, on the computer where the factory runs with its builder on. If the person wants it built here instead, say so, move the card to in progress and carry on with `build-test-first`.

When an extension of the factory started you (its prompt says so), also follow the guide that extension names: it says how to answer there and what that setting changes.

Changes to the factory itself in this company (its `AGENTS.md`, its skills or its folder structure) get a row in the company's CHANGES.md, with the reason, before you make them. The core's own files are not changed here: a change the core needs is suggested to its maintainer, written without company details.

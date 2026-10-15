---
name: factory
description: Set the scene and route software requests through planning, building, reviewing, showing and remembering. Use when the person invokes $factory or asks to build or change something here.
---

Factory sets the scene and routes the next move through the skills. It is the entry point for a request, and it coordinates the work of the other skills. It reads the request, the relevant context and the state of the products, and opens a conversation with the person to clarify the goal, scope and next move.

## Approach

Read the company's instructions (`AGENTS.md`), the relevant knowledge (start at context/index.md) and the current state of the products involved. Each product describes itself in its folder: its `product.json` (name, kind, who uses it, its commands) and its `BLUEPRINT.md` (kind, structure, promises, checks). If the request could change more than one product, ask which one before planning.

Start a new run in runs/NNN-short-name.md, numbered after the last one, with the following sections:

- **Request**: the request and any relevant context, including the current state of the products.
- **Plan and checks**: the agreed scope, the plan to implement it, and the checks to verify it. Include any relevant trade-offs, alternatives and decisions.
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

When an extension of the factory started you (its prompt says so), also follow the guide that extension names: it says how to answer there and what that setting changes.

Changes to the factory itself in this company (its `AGENTS.md`, its skills or its folder structure) get a row in the company's CHANGES.md, with the reason, before you make them. The core's own files are not changed here: a change the core needs is suggested to its maintainer, written without company details.

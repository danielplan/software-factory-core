---
name: update-context
description: Update the knowledge base. Use whenever you learn something worth keeping for later (what exists, how to run it, a trap, a convention), when the person says to remember something, and at the end of a factory run.
---

This skill guides the agent's record keeping. Keep durable facts and decisions accurate without making the person manage the files. Report meaningful updates briefly as part of the result; routine maintenance does not need another conversation or approval step.

Follow the knowledge base's page on maintaining it (docs/how-to/maintain-the-knowledge-base.md): it says where each fact goes and how a page is written. In short:

0. **Feature pages (docs/reference/features/):** bring the page of each feature you changed in line with what was built: what it does, its rules, where it lives in each product, what was checked and what was not.
1. **Conventions and lessons (docs/reference/conventions/, docs/reference/lessons/):** when the run set a better pattern for a kind of product, update its conventions page and its "example to copy"; add a trap you hit to the lessons for that kind, with the run number.
2. **Blueprint:** add a new promise (something that must stay true) to the product's `BLUEPRINT.md`, and fix any promise or structure line the build changed. If the build departed from it, say so and fix it, or note the difference under Open. No history in the blueprint. Keep the product's `product.json` true too (its users, commands and start page).
3. **Decisions, reference, product:** a newly accepted choice gets a numbered MADR record in docs/decisions/, as the page on recording a decision says; changes to the products or the factory go to docs/reference/, how to run them to the how-to pages; approved product intent to docs/explanation/. Never edit docs/sources/: add a newly dated source instead.
4. **One fact, one place, present tense.** Replace older text instead of adding to it; link the run instead of telling its story. Add a new page to its section's `index.md`.
5. Run the knowledge base's checks (`npx software-factory check-docs`), then tell the person what changed in the knowledge base in one or two lines. Besides links and page rules it checks that every file or folder path written in backticks still exists: when the build moved or deleted a file, fix the pages that name it.
6. If the agreed work is complete, set the run status to `done` only when checks passed or unverified checks and their reasons are recorded. If ending with unfinished work, use `stopped` with the reason. Mid-run updates leave the status alone.

**A lesson for every company.** When something you learnt would hold for any company using the same kind of product or the same tool (not only this company's products), write it in this company's lessons as usual, and also mark it in the run's Later section as a suggestion for the factory core, written without this company's names, data or wording. The core's maintainer decides whether it becomes a kit or core rule.

Write only what you saw in this run. Mark anything uncertain as uncertain.

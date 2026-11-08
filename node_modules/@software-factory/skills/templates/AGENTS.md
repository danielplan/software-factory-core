# Software Factory

This folder, `factory/`, is the software factory for <company>, kept in the project's code: its settings (`factory.json`, with the products' folders) and its history (`runs/`). What the project knows is in its `docs/`, one space for its own documentation and the knowledge base; each product describes itself next to its code (`product.json`, `BLUEPRINT.md`).

<!-- company: one sentence on what the project is for. -->

When you are asked to build or change something, use the factory skills to plan, implement, verify and record the work. Start with the `factory` skill.

## Rules

- Ask before you build or change something that could affect the product scope, user experience, data ownership, or another decision that is not yours.
- Use simple, clear and consistent language in the code, comments, and documentation.
- Your users are not developers, but are curious and capable. Explain the trade-offs and the decisions you make, explain them in a way that is understandable to a non-technical person, and provide options when appropriate.
- Standards before home-made code. Before writing code for a common problem (validation, forms, routing, sign-in, data access, migrations, translations, dates, charts, layout, tests), use what the framework already provides, then a widely used, maintained library that fits it. Write your own only when neither fits, and say why in the run. When you find home-made code that a standard covers, propose replacing it.
- If the request could change more than one product, ask which one before coding.
- Ask for an account, a credential or a purchase instead of trying to get one.
- What is known lives in the repository: the knowledge base, a product's blueprint, a decision record. Never only in an agent's own memory (such as Claude Code's memory) or a chat, where no other agent or person finds it. When you find a note kept only there, write it into the knowledge base.
- Write down what is not done: unfinished items go into the product's blueprint (under Open) or the run's Later section before a run is called done.
- Never loosen a check or add a lint-disabling comment without asking.
- Changes to this file, the skills or the folder structure get a row in `CHANGES.md`, with the reason, before you make them.

<!-- company: rules only this company has. -->

## How every product is built

These defaults hold for every product, whatever its kind. Each kind's kit adds its own layout and tools; the company's own conventions pages add to both.

- **Each product is independent:** its own folder, packages, tests, `README.md`, `BLUEPRINT.md` and `product.json`. Products do not share code until the contracts between them are stable enough to share.
- **One command checks everything:** each product's `verify` command (named in its `product.json`) runs its format, code-quality, type and test checks, and must pass before a run is done.
- **Organise by feature, then by job.** A feature lives in one folder; inside it, each file's name says its job. A new feature then means one new folder, and a change stays in one place.
- **One job per file.** No catch-all files (such as `utils.ts`): they collect unrelated code and become hard to change. Keep a helper next to the feature that uses it until a second feature needs it.
- **Split by reason to change, not by length.** Split a file when two parts change for different reasons.
- **Dependencies point inward.** Screens and routes call services; services use rules and declared stores; rules import nothing from HTTP, databases, the screen or the platform. Rules are then easy to test and reuse.
- **Names say what a thing is.** Avoid names that need history to understand, such as what a thing replaced or where it was copied from.
- **Settings live in `.env`.** Addresses and test connections come from an ignored `.env`, with a tracked `.env.example` that has no secrets.
- **Real data only.** Screens show real records; missing data shows an empty, unavailable, loading or error state, never invented sample values.
- **Guard important boundaries with a check.** A small architecture test that fails when a rule is broken keeps the structure clean after we stop watching.
- **Small, behaviour-preserving refactors.** Change structure and behaviour in separate steps, with tests passing after each.
- **Testing:** rules get fast unit tests; each journey gets an end-to-end check unless the run records why not. Record each check's result separately: a later success can hide an earlier failure.

## The products

<!-- company: each product in one line: its folder, what it is and who uses it. The full description is its product.json and BLUEPRINT.md. -->

## Factory workflow

Start with the `factory` skill. It opens a run file in `runs/NNN-short-name.md` and routes through `plan` → `build-test-first` → `review-structure` → `show-result` → `update-context`. When the factory is connected to a board, work comes from its cards: `npx software-factory card` lists, plans and readies them (`npx software-factory card help`).

- `docs/index.md` is the knowledge base's entry point, organised with Diátaxis: `tutorials/` (learn by doing), `how-to/` (steps for a task), `reference/` (the products, `features/` one page per product feature, `conventions/` one page per kind of product, `lessons/` sorted the same way), `explanation/` (product intent and system context). `docs/decisions/` holds numbered MADR decision records. `docs/sources/` is immutable: add a newly dated source instead of editing. Runs are the only history.
- Each product has a `BLUEPRINT.md`: its kind, structure, promises (what must stay true; ask before changing) and checks.
- After changing Markdown pages, run the knowledge base's checks (`npx software-factory check-docs`).
- The git hooks enforce the checks on commit and push; never bypass them with `--no-verify`.

<!-- company: how to set up a fresh copy and run each product, or a link to the how-to page that says it. -->

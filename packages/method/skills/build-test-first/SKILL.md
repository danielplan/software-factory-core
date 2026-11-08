---
name: build-test-first
description: Build or change something in the selected product with tests first. Use whenever code is added or changed, such as a new feature, a bug fix, or a change the person asks for, including inside the factory flow.
---

Work in the selected product's folder (the one its `product.json` names, for the product the request is about). Do not create a generic `app/`. If the product's folder does not exist yet, the scope must have been agreed in `plan` first.

This skill guides the agent's implementation. Keep test commands, file organisation and debugging mechanics internal unless they help explain a result or the person asks.

Build into the structure in the product's `BLUEPRINT.md` and the conventions for its kind (its kit's rules and the company's own), keeping the blueprint's promises. Choose routine files and modules within those parts yourself. If a new responsibility, user-visible behavior or technology is needed, return to `plan` for that choice before building it.

Build the checks in the run's check plan. For a new feature, start with the journey's end-to-end check, then the lower levels. A check that cannot run yet (no device, no database) stays written down as unverified; never report it as passed.

1. **Find how tests run.** Look in the product for its existing test setup and its full check (the `verify` command in its `product.json`). If there is none, use the tool agreed in `plan`; return there if a material tool choice is still open.
2. **Write one failing test** for the first thing the request needs. Run it and see it fail for the right reason (the feature is missing, not a typo). Commit the test.
3. **Write the least code that makes it pass.** Run the test. Run the whole suite.
4. **Commit** with a message that says what changed and why.
5. **Repeat** for the next check until everything in the run file's "Plan and checks" passes.

Before writing code for a common problem, check what the framework and the product's existing libraries already provide, then widely used libraries that fit; write your own only when none fits, and note why in the run. A new library that the plan did not name goes back to `plan`.

Build only what the request asks for. Put anything extra you noticed under "Later" in the run file, and do not build it.

If a check cannot be a test (a look, a feel, a screen on a device), say so, build it, and leave it for the person to see in `show-result`.

If you need an account, a credential or a purchase, stop and ask.

Build in manageable slices and continue through the agreed scope without renewed permission after each slice. Explain useful milestones. Investigate failures yourself; route to `plan` when resolving them needs a material change to the agreed plan. Documentation-only instruction edits need review and applicable validation, not artificial failing code tests.

---
name: review-structure
description: Review completed code changes for clearer responsibilities, useful reuse and maintainability. Use after substantive implementation or when asked to reconsider code structure; include relevant official ecosystem skills without broad rewrites.
---

Review the finished work against its purpose and actual callers. Find concrete ways to make the next change easier while preserving the agreed behavior and the product's decisions. Start with inspection; this review alone does not authorize additional implementation or installations.

## Review completed work

Read the agreed scope, the applicable product and design guidance, the final diff, and the verification results. Follow representative changed paths through their callers, data ownership and side effects. Compare the implementation with nearby code; review the affected boundaries rather than auditing the whole repository.

Look for home-made code that the framework or a widely used library already covers (validation, forms, routing, access checks, data access, translations, layout); recommend the standard with what it replaces. Look where the change creates friction: mixed responsibilities, duplicated rules, unclear state or transaction ownership, dependencies crossing boundaries, catch-all modules, fragile coupling, unnecessary abstractions, and outdated code whose callers have disappeared. For interface work, consider shared components, accessibility and design-guide consistency; for other platforms, use their own conventions. Do not prescribe one folder layout or stack for every product.

Recommend a split or abstraction only when independently changing responsibilities or demonstrated reuse justify it. Keep small local helpers local. Line count, personal taste or a hypothetical future feature is not sufficient evidence. Before suggesting deletion, check callers, configuration and runtime entry points.

For each actionable finding, give the location, observed problem, practical consequence, smallest useful improvement and checks needed to preserve behavior. Distinguish defects that affect the agreed result from optional improvements. Report uncertainty and the limits of inspection. Finding no worthwhile change is an acceptable result; do not manufacture a refactor to complete the review.

## Useful ecosystem skills

Inspect the selected product's real dependencies, versions, platform and configuration, together with skills already available. When a concrete gap appears, consult the tool maintainer's official documentation for agent skills and follow its link to the actual source. Read the skill before recommending it. Check compatibility, useful coverage, overlapping instructions, maintenance and side effects; a popular name or an install command alone does not establish fit.

Prefer guidance matched to the installed version. Do not upgrade the product, change its architecture, install every skill in a bundle or add accounts or services just to use a skill. Preserve the person's choices and applicable design foundations when upstream examples assume a different product or framework.

Install a suitable skill when the person's existing authorization covers it; otherwise report it as a candidate with the reason and official source. Use the available installer guidance, preserve existing skill directories, and keep the installation local to the workspace unless another location was requested. Record the source revision, destination, purpose and any adaptation. Installation instructions do not authorize executing the skill's deployment, publishing or other external actions.

## Finish the review

Fix necessary defects and small behavior-preserving improvements within the already agreed scope through `build-test-first`, then rerun affected checks and review the changed boundary once more. Return material product or ownership choices to `plan`. Keep wider recommendations in the run's Later section; they do not delay delivery of working, verified scope.

Record what was reviewed, findings and checks in the run. Explain only meaningful findings in plain language, then continue to `show-result` and `update-context`. For a standalone review, report the findings without assuming a build is wanted.

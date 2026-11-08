---
name: show-result
description: Run what was built and show the person how to try it. Use whenever something in the selected product was built or changed and the person should see it, or when the person asks to see or try it, including inside the factory flow.
---

This skill guides the agent's verification and delivery. Show the working result in plain words; explain setup only as needed for the person to try it. For instruction or documentation changes, show the changed responsibilities or behavior and report review and validation instead of starting an unrelated application.

1. **Run it** yourself, the way the person will. A command-line tool: run it and show the output. A web app: start it and give the address. An app that needs a device or simulator: run it there if you can, otherwise say you could not. When the request came with something agreed to look at (a sketch, a picture, an approved prototype), take a screenshot of the real result for the situations that matter, and explain any noticeable difference.
2. **Tell the person how to try it:** one command or a few steps, and what to look for.
3. **Say what you did not check.** Never report a check as passed if it did not run.
4. **Write the "Result" section** of the run file: what was built, how to try it, what was not checked, the commit.

Return to factory to record context and close completed work; feedback is not an extra completion gate. When the person tries it and gives feedback, route material plan changes to `plan` and implementation corrections to `build-test-first`.

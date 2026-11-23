---
name: prototype
description: Make and run a clickable prototype of a card in the real app, in its own copy of the code, and show it to the person. Use whenever a plan reaches screens (the plan skill's UX/UI step), when the person asks to see, try or prototype an idea, or to test a card's prototype.
---

A prototype is the real product with the card's change in it, on the card's branch, that the person can click through. It runs in a copy of the code of its own, so the person's own folder, its branch and its data are never touched.

The core makes and keeps the copy; what running it means (its servers, its database, made-up data) is the project's own, named in `factory.json` under `prototype` (`start`, and optionally `stop` and `remove`). Without it the copy is made and you start the product by hand, as the project's `README.md` says. (In Kobble's prototype mode, Tinker works the start out itself while it makes an exploration's first prototype and keeps it there, marked `"by": "tinker"`; a start a person wrote has no mark and is never changed.)

**What the start command does.** It runs in the copy and is told which one in `FACTORY_COPY`, `FACTORY_BRANCH` and `FACTORY_PROJECT`, with `FACTORY_CARD` for a card's prototype or `FACTORY_IDEA` and `FACTORY_VERSION` for a version of an idea in Kobble's prototype mode (`npx software-factory prototype <idea> <version>` from a terminal). It gives each copy its own ports and data, and **says where the prototype runs with a line of its own: `FACTORY_URL=<address>`** (for example `FACTORY_URL=http://127.0.0.1:5301`; the last such line counts). Prototype mode shows that address in its frame; without the line it cannot show the version. The command may start its servers and end, or keep running.

1. **The card first.** A prototype belongs to a card on the board (`npx software-factory card list`). No card yet: make it (`card new`).
2. **Start it:** `npx software-factory prototype <card>`. The first time it makes the copy in `<project>-prototypes/issue-<card>`, on the branch `factory/issue-<card>`, then runs the project's start command there. Anything after the card number goes to that command (a project may offer options, such as which made-up data to use). Never prototype in the person's own folder or switch its branch.
3. **As simple as possible: one place, your way.** Build only what the person needs to react to, in the one place where it matters most, the way you imagine it. No variants side by side, no second screen "for comparison", nothing around it they did not ask about. Name the alternatives in a sentence if they matter; build them only when the person asks.
4. **Build in the copy.** Edit the files in the copy's folder (`npx software-factory prototype list` shows where); the product's own servers reload on their own. Start from a similar page and the product's own pieces. Data is made up and says so, never real people's. Try, don't check: no tests while prototyping.
5. **Look at it yourself** before you show it, at desktop and phone width, as the project's own start command or its `README.md` says how. Read what you see; fix what overlaps, is cut or floats alone.
6. **Show it:** give the person the address the start command printed, and the pictures. Say what to look at and what is not real yet. Ask one question.
7. **Change it as they react**, then show it again.
8. **When they agree:** commit in the copy ("Prototype for #<card>"), push the branch, and hand the plan on with `card agree <card> --plan-file <file> --prototype factory/issue-<card>`. Then `npx software-factory prototype <card> --stop`, and `--remove` once the card is built (the branch stays).

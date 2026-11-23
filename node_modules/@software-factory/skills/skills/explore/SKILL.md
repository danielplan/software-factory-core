---
name: explore
description: How the kobold helps explore ideas in Kobble - writing the story it assumes behind a team member's own idea (every scene guessed, its problem assumed), and making a version of an idea in prototype mode, in the version's own copy of the code on its own branch. The kobold proposes; a person tries the versions, picks one and sends it to Build.
---

An idea is what the team thinks would help one persona. It starts from a story that breaks at a problem, or from a team member's own idea. Each idea gets versions: each version is the real product with the idea in it, on its own branch, which the team tries in prototype mode, compares and picks from.

## The rules

- **An own idea comes with its story, all guessed.** Nobody said it yet: every scene of its story is guessed, and the problem it breaks at is assumed. When a signal later shows a scene, it becomes seen.
- **One problem per story.** The story breaks exactly once, at one problem of the idea's persona.
- **In the persona's words.** The story is what the persona goes through, not what the product does. The problem is what goes wrong for them, not the missing feature.
- **A version is the real product, with one change.** Never a mock-up beside it.
- **You propose, a person confirms.** What you write says it is yours; the team tries it, edits it, picks or throws it away.

## Writing the story behind an own idea

1. Read the idea, and the persona it is for: their role, what they do, what they want, and the stories already told about them.
2. Give the idea a short title (two to five words) and one sentence of what the team thinks it would do: "If …, <persona> would …".
3. Tell the story the idea assumes, in three to five scenes, in order: where it starts, what the persona wants, each scene one short sentence with its subject, so the scenes read as one paragraph, with no labels before them. Name the story as a situation and its problem as the obstacle, never the same words. One scene breaks: the moment the idea is meant to fix. Say what the persona does instead, when it helps.
4. Name the problem it breaks at, in the persona's words, with a line on what is behind it.
5. Call `write_idea` once with all of this. Its answer says what it wrote, or what does not fit: correct it and call it again.

## Making a version

You are in the version's own copy of the code, on its branch. Change only files in this folder; the factory commits what you leave when you are done, on this branch only. Never push, never switch branches, never touch the person's own folder.

1. Read the idea, its story and what the person asked for this version.
2. **As minimal as possible: one place, your way.** A prototype is thrown away or rebuilt by the build once a version is picked, so build only what the person needs to try the idea, in the one place where it matters most, from a similar page and the product's own pieces. Nothing around it they did not ask for:
   - **One language.** Write the words straight into the screen, in the language the person speaks to you; no translations, no new message files or keys, even where the product's conventions ask for them (they are for the build, which translates).
   - **The way that works, not every way.** No new settings, permissions or other screen sizes unless the idea is about them.
   - **Every variant in its states.** Think through each state what you change can show: empty, loading or starting, a problem with its message, long names or long words (a folder's path), many items, and the usual one. Make the ones that matter for the idea shown in every variant, from made-up data, chosen outside the app by the page address like the variant (`?state=empty`; the usual state without it): read it when the app loads, next to `?variant=`. None may break: text wraps inside its box, nothing spills out or overlaps, buttons stay reachable. Name them in your last words (step 9).
   - **Small for its idea.** A big idea needs more than a small one; the question is only whether each piece is needed to try it. When you catch yourself finishing parts nobody will try, you are building the feature: cut back to what the idea needs.
3. **Variants, when your prompt names them,** all in this one copy. Which one shows is chosen outside the app, by the page address (`?variant=B`; the first one without it): read it when the app loads, keep it for the visit (sessionStorage), and let only the places where the variants differ ask which one shows. Nothing in the app shows or switches them. Without variants named, make one way only.
4. **Read what matters, then build.** First read what decides how it must look and work: the design system page your prompt lists (the product's look: frame, type, colours, pieces) and the pages about what you change, and the product's own rules for its pages. Then pick the files from the code map and start changing them: open only those, and only the part you change (a function, a component), never whole files to get a feel for them, never another package's code (the server for a page change) unless the change itself is there. When you are asked for a change, you are the maker who made this prototype before: you know what is there, go straight to the place and change only what is asked.
5. **Built from the product's own pieces.** Start from the most similar page and build the same way: the same components, layout, spacing and words. Extend a screen or area that exists rather than adding a page, unless asked. A piece the product lacks: first copy one from another product in this repository and adapt it (never import across products); else add the standard one from the product's own kit.
6. **A library when it helps.** When a screen needs what the product's kit does not do (a chart, a map, a calendar), you may add one well-known, maintained library that fits its framework, never a little-known one.
7. **The data the change needs, where it shows.** Open the page the change is on as the prototype starts and ask what someone needs to see there to try it: the cards, orders or people the change is about, in the state that matters (a stuck card, a late order). When the prototype's own data does not have them (no board, an empty list), add made-up ones in the prototype, on that page, so the change is visible the moment it opens. Data is made up and says so, never real people's. Try, don't check: no tests, lint or builds while prototyping.
8. **Look, then click through a bit.** When it is built, look once with `look_at_prototype`: it starts your prototype and photographs it on its page, each variant. Then, with your browser tools, go once through the main thing people do with your change (open it, click the button, type, wait for the answer), in each variant: a few clicks, not every path. Fix what is plainly broken (it does not show, it spills out, the data is missing, the wrong page, something opens by itself, jumps, says a thing twice or gets stuck), then stop. No tests, lint or builds, and no rounds of checking after each small fix: the team tries it, and the build checks it later.
9. **End with your last words**, two or three plain lines, shown on the prototype's card and kept with the version, so the build checks them: what you changed, where to look when it runs, and every library you added or piece you copied ("added a chart library, recharts"; "copied the list from the shop"). Then a line with the states you made, short lowercase names, `States: empty, loading, problem` (none when there are none), and one last line with the page the change is on, where the prototype opens: `Opens at: /fuel/planner` (a path) or `Opens at: #build` (a page of an app that keeps its pages after #).

## The made-up world

When a product names a made-up world (its `world` in `product.json`: a folder of situations, `<key>.json` with `name`, `about`, `clock`, `signed_in` and `tables`), the prototypes of an exploration share one live world instead of each keeping its own made-up data. The start command is told where it is, `FACTORY_WORLD_URL`:

- `GET` it for `{situation, version, signed_in, tables}`, and again every few seconds, so a change in another tab or device shows;
- `POST` `{version, changes: [{table, op: "add" | "change" | "remove", row}]}` with the version you read; rows are found by their `id`. The answer is the new world; 409 means it changed meanwhile: read it again and redo the change;
- `POST <url>/reset` starts it again from its situation.

The prototype reads its data from the world, signs in as `signed_in` says, and writes back what it changes, so the other prototypes see it. When a screen needs data the world does not have yet:

- data the product keeps already: read it from its table;
- something new: add it as a column of the table it belongs to (the kobold can put it in the world's rows); do not change the product's situations, which follow its real data: the build makes it real there.

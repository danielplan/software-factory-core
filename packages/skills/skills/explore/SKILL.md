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
2. **As simple as possible: one place, your way.** Build only what the person needs to try the idea, in the one place where it matters most, from a similar page and the product's own pieces. No variants side by side, nothing around it they did not ask for.
3. **Read little.** Your prompt has a map of the product: its screens and its shared pieces. Open the files the change needs; look further only when the map does not say enough.
4. **Built from the product's own pieces.** Start from the most similar page and build the same way: the same components, layout, spacing and words. Extend a screen or area that exists rather than adding a page, unless asked. A piece the product lacks: first copy one from another product in this repository and adapt it (never import across products); else add the standard one from the product's own kit.
5. **A library when it helps.** When a screen needs what the product's kit does not do (a chart, a map, a calendar), you may add one well-known, maintained library that fits its framework, never a little-known one.
6. Data is made up and says so, never real people's. Try, don't check: no tests, lint or builds while prototyping.
7. **End with your last words**, two or three plain lines, shown on the prototype's card and kept with the version, so the build checks them: what you changed, where to look when it runs, and every library you added or piece you copied ("added a chart library, recharts"; "copied the list from the shop").

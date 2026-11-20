# A clearer System map

## Request

Card [#12 A clearer System map](https://github.com/danielplan/software-factory-core/issues/12).

The System page shows the product's parts in columns with one arrow between
columns, so the team cannot see which part actually needs which. It should
show clearly how each part connects to the others, well structured.

Agreed: **A3 · Real map with lines** (prototype on `proto/X-2-a3`,
exploration X-2).

Where things stand (core 0.12.0): System shows "Your product" as columns
(`columnsOf`), one arrow between columns; parts (`Part` in
`packages/core/src/parts/part.ts`, made by the kits from each product) do not
say what type of part they are.

## Plan and checks

What people see (as in prototype A3):

1. **A real map.** "Your product" on System is a map: each part a box (its
   light, name, Open, buttons, problem, as now), laid out left to right with
   the same layout as an exploration's board (ELK), and a line from each part
   to exactly the parts that need it, its arrow at the part that needs it.
   Pointing at a part brings out its own lines and the parts at their other
   ends; the others fade. A line under the map says how to read it.
2. **A type tag in each box,** on its own small line just above the part's
   name, at the box's left edge: Screen, Backend, Data or Outside service,
   each with its own colour and small icon. No key under the map: pointing
   at a tag, focusing it with the keyboard or tapping it shows only that
   tag's meaning: Screen "what people open, a web page or app"; Backend
   "works behind the screens"; Data "where data is stored"; Outside service
   "run by someone else, like payments".
3. **Parts say their type.** A part gets an optional `type` (`screen`,
   `backend`, `data`, `outside`). The kits set it: React web app, SvelteKit
   app and Expo app are screens; NestJS backend and TypeScript package work
   behind the screens. A product may say its own in its `product.json`
   (`type`), which wins over its kit's: the way for "Other code" (which
   cannot tell), a database or an outside service. A part with no type shows
   no tag.
4. The factory's own programs (in Settings) keep their columns.

Checks:

- Core: a part's `type` is one of the four and optional; a product's `type`
  is read from `product.json`.
- Kits: each kit's part has its type; the product's own type wins.
- Launcher: a part's view carries its type.
- Dashboard: the lines of the map (who needs whom, only known parts) and the
  four types' words, as tests; the map's look, the tooltip and the
  highlighting in the browser (show-result, screenshots).
- `npm run verify` passes.

Decisions made while building (cheap to change):

- The tag follows the prototype's last version (its own line above the name,
  at the box's left edge), not the earlier "beside the name" in the card's
  text: "What we learned" and the last prototype change both say above the
  name.
- No guessing of a part's type from its name (the prototype guessed, since
  parts did not say): a guess shown as a fact can be wrong; a part without a
  type shows no tag, and its product can say it.
- The field is called `type`, since a product's `kind` already means its kit.

## Status

in progress

## Result

## Later

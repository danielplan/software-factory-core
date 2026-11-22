# Writing an extension for the team

Read this when a card asks for an extension of the team's own: something the
factory should be able to do that Kobble's own extensions do not. The team
asked for it through Sprocket's chat, it was explored, and the plan on the
card says what it is for. You write it; the owner reviews the pull request
before it reaches the main branch, and the factory checks it again every
time it loads.

## Where it goes

One folder for each extension, in the company's factory folder:
`factory/extensions/<id>/`. The folder's name is the extension's id, in
lowercase letters, digits and dashes (`brand-words`). In it:

- `extension.json`: the description (below). Nothing else is needed.
- Markdown files, for the guides it brings.

Write only in that folder. Never change Kobble's own extensions, the
dashboard or the server: if what the team asked for needs that, say so on the
card instead.

## The starter

Start from [the extension starter](extension-starter/README.md): a whole small
extension with a page, a Home block and a stage, which loads as it is. Copy it
to `factory/extensions/<id>/`, rename it and keep only what the team asked for.

## The description

```json
{
  "id": "brand-words",
  "name": "Brand words",
  "about": "Keeps the product's texts in the team's own voice.",
  "needs": ["factory"],
  "slots": [],
  "pages": [],
  "blocks": [],
  "stages": [],
  "brings": { "kobolds": [] },
  "settings": [],
  "guides": [
    { "agent": "builder", "title": "Our voice", "file": "our-voice.md" }
  ]
}
```

- `name` and `about` are shown in the Marketplace as written: plain words, a
  line each, for people who are not developers. Write them in the team's
  language.
- `needs`: ids of other extensions it cannot work without (`"factory"`, or
  another extension of the team). Installing it brings them; removing one
  that another needs is refused.
- `slots`: `"code"` or `"tasks"` when it uses the connection the factory
  filled at setup. It never connects anything itself.
- `guides`: Markdown files in its own folder, for an agent (`builder` today).
  The agent reads them before it works. This is how a rule of the team's own
  reaches every card: write what to do and why, in plain steps.
- `settings`: groups of settings (see the core's `settingGroupSchema`), kept
  in `team.env` or in a file in the `settings/` folder.

### A page and a Home block

A page and a block are described, never coded: Kobble's own page draws them
in its own look, so they look like the rest and cannot change how Kobble
works. Each has an `id`, a `name`, a line (`about`), an `icon` (`puzzle`,
`list`, `check`, `flag`, `calendar`, `chart`, `note`, `star`) and `parts`, one
under the other:

- `{ "show": "text", "title": "…", "text": "…" }`: some words (a blank line
  starts a new paragraph).
- `{ "show": "list", "title": "…", "items": [{ "title": "…", "about": "…",
"tag": "late" }], "from": "items.json", "empty": "…" }`: a list. The items
  can be written in the description, or kept in a JSON file of the
  extension's own folder (a list of objects with a `title`, and an `about`
  and `tag` if wanted), read each time the page is shown, so a kobold can
  keep it up to date. `empty` is what shows when there is nothing.

A page shows in the sidebar under Your team; a block can be added to Home
(Arrange Home › Add a block). Both leave when the extension is removed. The
ids `home`, `system`, `extensions`, `settings` and `connect` are Kobble's.
What a page cannot do: show anything but text and lists, run code, or read a
file outside its own folder. Say so on the card when the team asks for more.

### A stage

`"stages": [{ "id": "checklist", "name": "Checklist", "after": ["build"],
"before": ["done"] }]` puts a stage in the order work goes through, by naming
the stages it comes after and before (Kobble's are `signals`, `explore`,
`build`, `done`). A neighbour that is not installed is no problem. When two
stages fit the same place the factory cannot tell which comes first, and
Settings › Stages asks the team; the team can move any stage there. The
loop on Home shows the stage in its place, with how many pieces of work are
in it.

A stage can ask for **checks**: `"checks": [{ "id": "ticked", "name": "Every
item is ticked off" }]`. The board's **card** is the piece of work, and for now
the only one: it goes through Build, the team's stages between Build and Done,
and Done. A card leaves a team's stage for the next one only when every check
has passed, one stage at a time; sending it back needs none. A check is a name,
not code: a person or the extension's kobold marks it as passed on the card
(`POST /api/work-pieces/check` with the card's `number` and the `check`) and
moves it (`POST /api/work-pieces/move` with `number` and `to`). The card keeps
its stage (a `stage: …` label) and its history in its own text, so nothing
else is kept. Kobble's own stages (Build, Done) have no checks and are moved
on the board as before. There is no screen yet for moving a card between a
team's stages: say so on the card and do not promise one.

### Kobolds

`brings.kobolds` only lists a kobold by name for the Marketplace; an extension
cannot add one that runs yet.

## What the factory refuses

The factory leaves out an extension (and says why, in plain words, among the
factory's problems and in the pull request's checks) when:

- `extension.json` cannot be read, or has a word the description does not
  know, or lacks a name or a line;
- the id is not the folder's name, or is the id of one of Kobble's own;
- it says `core`, `always`, `tracker` or `parts`: those are only for
  Kobble's own extensions, so that nothing unknown starts a program;
- it brings a page, a block, a kobold or a stage that another extension
  brings, or a page Kobble keeps for itself, or says it brings a page or a
  block without describing it;
- a stage names itself as its own neighbour;
- a guide, or a list's file, is not inside its own folder, or a list's file is
  not a JSON list of items with a title;
- its settings are kept anywhere but `team.env` and the `settings/` folder.

One extension that is refused never stops the others. The team can also
switch all of them off in Settings › Your team's extensions.

## Before you call it done

- Load it: start the factory and see that the extension shows in the
  Marketplace, under Your team's, with its name and line, and that the
  factory has no problem to report about it.
- Say in the run what the extension does for the team and what it does not
  do yet.

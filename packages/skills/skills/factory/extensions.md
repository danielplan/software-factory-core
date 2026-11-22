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

## The description

```json
{
  "id": "brand-words",
  "name": "Brand words",
  "about": "Keeps the product's texts in the team's own voice.",
  "needs": [],
  "slots": [],
  "brings": { "pages": [], "blocks": [], "kobolds": [], "stages": [] },
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
- `brings`: the pages, Home blocks, kobolds and stages it is about, by id.
  The Marketplace lists them. **Nothing builds a page or a Home block from a
  team's extension yet**, and a stage or a kobold cannot be added by one:
  do not promise those on the card. Leave them empty unless the plan agreed
  to the lists as a description only.

## What the factory refuses

The factory leaves out an extension (and says why, in plain words, among the
factory's problems and in the pull request's checks) when:

- `extension.json` cannot be read, or has a word the description does not
  know, or lacks a name or a line;
- the id is not the folder's name, or is the id of one of Kobble's own;
- it says `core`, `always`, `tracker` or `parts`: those are only for
  Kobble's own extensions, so that nothing unknown starts a program;
- it brings a page, a block or a kobold that another extension brings;
- a guide is not a file inside its own folder;
- its settings are kept anywhere but `team.env` and the `settings/` folder.

One extension that is refused never stops the others. The team can also
switch all of them off in Settings › Your team's extensions.

## Before you call it done

- Load it: start the factory and see that the extension shows in the
  Marketplace, under Your team's, with its name and line, and that the
  factory has no problem to report about it.
- Say in the run what the extension does for the team and what it does not
  do yet.

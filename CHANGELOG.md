# Changelog

What changed in each release of the core, and what a company has to do when it
upgrades. Newest first. Versions follow [semantic versioning](https://semver.org/):
a major version may need a company to change something, and says what.

## Unreleased

- Setup writes the project's first context instead of drawing its code,
  as one picture of the project with its context inside it. The coach reads
  the code and its git history briefly (new tool `look_at_history`),
  confirms the products in a sentence, and draws an overview and the main
  workflows with `draw`: many small cards and the arrows between them in
  one call. A card is a short title, a line and an icon (from a closed list
  of everyday things), or a picture from the project with a caption
  (served only while a card shows it); a rule or a question is marked with
  its `tone` and drawn beside the step it is about. Cards are framed in
  areas the coach names, laid out along the arrows with ELK, and arrows go
  around cards. The coach goes one area at a time, the overview first,
  then each main workflow, and points the owner to what it is asking about
  (`focus`): the canvas moves there and shows it. A guess from the code is
  unconfirmed; what the owner says is confirmed. **Make the factory** writes the cards to
  `context/explanation/the-project.md` (a section per area, a line per
  card with where its arrows lead), linked from the explanation index. The
  coach's `add_note`, `add_diagram`, `change_thing`, `link` and `unlink`
  are gone; the canvas shows no products, notes or diagrams (Mermaid is no
  longer used).
- The setup page is plainer. The conversation has no header: while the
  coach works, its orb turns in the chat beside what it is doing; during a
  call, the same orb is the voice. The title and the form are gone. **Make
  the factory** is in the chat, and shows only once the owner has agreed to
  the project and at least one product. A card on the canvas shows only
  what it says and is dragged anywhere or taken off with its bin; the owner
  changes it by clicking it and telling the coach, not by editing it.
  Nothing for a company to do.

- Starting from an existing project is easier: a folder button beside the
  chat opens a folder browser, and the coach reads the chosen project before
  asking anything. Any project can be brought: the new **Other code** kit
  (`otherCode`) recognises a folder by its project files (package.json,
  pyproject.toml, go.mod, Cargo.toml and others), takes the start and check
  commands it can tell, and runs the start command from its button. A kit
  can be a fallback (`fallback: true` in `defineKit`): it only takes a folder
  in which no other kit finds a product, there or below, so a project's own
  apps win over the project as a whole. Nothing for a company to do.

- Voice is a core feature (it was planned as an add-on). On the setup page
  the owner can press Talk and speak with the coach: a speech model in the
  browser (Whisper) writes their words down, the coach's answer is read out
  loud as it is written (Piper, also in the browser; the browser's own voice
  when Piper cannot be used), and saying "stop" interrupts it. English,
  German, Italian, French and Spanish, chosen beside End call
  (`packages/dashboard/src/voice/languages.ts`). The speech model is
  downloaded once (about 0.8 GB); what is said stays on this computer. The
  setup coach's `say` takes `spokenIn`. Nothing for a company to do.
- Setup starts with nothing but the coach's question in the middle; the
  canvas, the conversation at the side and the button come once the owner
  answers. The tabs come once there is a factory, on a rail of icons at the
  left instead of the bar on top.

- Setup is one conversation and one canvas. The coach interviews the owner
  or reads their code first, and draws what it understands: the company and
  products, plus notes, diagrams (Mermaid) and arrows. Everything starts as a
  sketch and is drawn solid once agreed. The owner can edit, move and remove
  pieces, and click one to ask about it. The coach's tool `look_at_map` is now
  `look_at_canvas`, and `remove_product` is now `remove`.
- The coach decides what the factory needs installed (tools on this computer,
  such as Git and the GitHub CLI, and add-ons) and proposes each one with why.
  The owner approves it on the canvas. **Make the factory** installs only what
  was approved: add-ons go into `factory.json`, and tools are installed with
  the system's package manager (Homebrew, winget), or the owner is told how.
  `Session` now takes `tools` (`computerTools()` in the command).
  Nothing for a company to do.

- Setting up by talking: the setup coach (Claude Code on this computer) asks
  about the company, reads existing code, and draws the company and its
  products on a map that the owner can change, with a first blueprint per
  product; **Make the factory** writes it. The form stays as an option.
- The core runs Claude Code kept open between turns (`WarmClaude`) and turns
  its events into plain lines (`describeEvent`); a run can deny more tools
  (`deny`) and add instructions for the whole conversation (`instructions`).
- `addProduct` takes the product's first blueprint; products added in setup
  keep who uses them and what they need.
- The method has the coaches' guides (`guidesFolder`).

- A factory you can set up and run: `node packages/server/bin/software-factory.ts`
  opens the setup page (start something new, or bring existing code) and then
  the dashboard (System, Products, Settings).
- Products are described in the factory folder (`products/<id>/product.json`,
  with `code` pointing at their code) instead of in their own folders; the
  company file has `about` and `tracker` (none, GitHub board, Jira Cloud) and
  no `products` patterns.
- Kits recognise their kind of product in existing code (`detect`) and make a
  new one with the framework's starter (`create`); the first kits: React web
  app, NestJS backend, Expo app.
- The launcher; settings of the secret kind (saved, never shown again).

- The first version of the core: product descriptions (`product.json`), the
  company file (`factory.json`), the extension registry, parts, settings
  groups, running Claude Code and working copies (`packages/core`); the method
  (`packages/method`); the knowledge base's structure and checks
  (`packages/knowledge-base`); an example company (`examples/acme`).

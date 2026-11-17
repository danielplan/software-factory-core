# Changelog

What changed in each release of the core, and what a company has to do when it
upgrades. Newest first. Versions follow [semantic versioning](https://semver.org/):
a major version may need a company to change something, and says what.

## Unreleased

- New: Connect on the Signals page, before the live app is connected: what Kobble reads, the export's address and token, and an example of what will come. Connect reads the export once with the token and says plainly what is wrong; when it works, it keeps `KOBBLE_LIVE_URL` and `KOBBLE_LIVE_TOKEN` in the project's `.env` (adding `.env` to the project's `.gitignore` when it is not there) and reads at once, then every 30 minutes. The token is never sent back to the page. New endpoints: `POST /api/kobble/connect` (`url`, `token`), `POST /api/kobble/disconnect`, `GET /api/kobble/handled`. Nothing to do.
- New: Settings, The live app: the address Kobble reads from (never the token), and Disconnect, which takes both lines out of `.env`. Nothing to do.
- Changed: the empty pages say what goes there. Signals with nothing new: "All quiet", when the kobold looks again, and the signals already handled. Explorations with none: what an exploration is, Explore a signal and Start from your own idea. Personas with none: "Who are you building for?" and New persona. An empty column on the Factory board says "Nothing here". The sync's state (`GET /api/kobble/signals`, `sync`) also has `address` and `next`. Nothing to do.

## 0.11.0 (2026-11-17)

**To upgrade:** pin `release-0.11.0`, `npm install`, `npx software-factory upgrade`. Kobble is now Signals, Explorations, Factory and Personas, kept as files in `factory/kobble/`. **To do, if you like:** set `KOBBLE_LIVE_URL` and `KOBBLE_LIVE_TOKEN` in the project's `.env` once the app offers the live export, and delete the old `factory/kobble.db`, `factory/kobble-seed.json` and the `kobble.db*` line in `factory/.gitignore`.

- New: the Factory page (`#build`, Factory in the sidebar) is the connected GitHub board in four columns: To do (with the board's Backlog and Planning), Building, Review and Done. Each card shows its number and title, and the exploration and prototype it was handed off from, or a Fix chip. The builder's switch and what it builds are a quiet line in the header, with Read it again and Open on GitHub. Without a board the page says so and leads to connecting one. New endpoint: `GET /api/kobble/factory`. Nothing to do.
- Changed: Fix on a signal now makes a GitHub issue on the connected board, in To do, with the signal's words and its id in a hidden mark (`<!-- factory:kobble signal=<id> -->`), and the signal goes to it (`to` is `#<number>`). Without a connected board, Fix is refused and says how to connect one. "Already fixed in #n" says the card's column, such as (Done). Nothing to do.
- Changed: every page has the same look: on the grey ground, the title with the page's buttons on the right, white cards with radius 20px. Workshop and Settings too. The white panel and the bar at its top with Ask the kobold are gone. Nothing to do.
- Removed: Understand, the old Explore with ideas and versions, prototype mode for ideas (`#prototype`), and Build with "did it work?", with their endpoints (`/api/understand/*`, `/api/records`, `/api/signals`, `/api/sources`, `/api/explore*`, `/api/prototypes*`, `/api/build*`) and the kobold's Understand jobs. The records in `factory/kobble.db` (SQLite) and `kobble-seed.json` are no longer read; Kobble keeps everything in `factory/kobble/`. `software-factory check` checks those files. Old addresses lead to the new pages (`#understand/<persona>` to the persona, `#prototype` to Explorations). `software-factory prototype <idea> <version>` is now `software-factory prototype <exploration> <option>` (X-1 b, on `proto/X-1-b`). New factories no longer list `kobble.db*` in `factory/.gitignore`. **To do, if you like:** delete `factory/kobble.db`, `factory/kobble-seed.json` and the `kobble.db*` line in `factory/.gitignore`; nothing reads them any more.

- New: Kobble's signals, explorations and personas as files in the product's repository, under `factory/kobble/`: `signals/S-0001.json`, `explorations/X-1/exploration.json`, `personas/<id>.json`, and `sync.json` (when the live app was last read). They are meant for git, so the team shares them like the code; each is checked when it is read or written. The records in `kobble.db` stay as they are for now. `software-factory check` also checks these files. Nothing to do.
- New: the live export, how Kobble reads signals from the app as it runs ([the live export](docs/reference/live-export.md)): `GET <KOBBLE_LIVE_URL>?since=<cursor>` with `Authorization: Bearer <KOBBLE_LIVE_TOKEN>`, answered with anonymous events (`bug-report`, `suggestion`, `limit`, `automation-failed`, `error`, `other`). The two settings come from the environment or the project's `.env`; a `file:` address reads a file instead. Kobble syncs when the factory starts, every 30 minutes and on Sync now (`POST /api/kobble/sync`), takes each event once, and looks for an open exploration or a fix that exists already. Without the settings the sync is off. **To do, to see live signals:** set `KOBBLE_LIVE_URL` and `KOBBLE_LIVE_TOKEN` in the project's `.env` once the app offers the export.
- New: the Signals page (`#signals`, the first page now): the new signals with who they are from, their type (Bug, Feature request, Feedback) and their text, and the one picked with Fix, Explore (Add to X-n when it is about an open exploration) and Dismiss, and the line "Already explored in …" or "Already fixed in …" when there is work for it already. New endpoints: `GET /api/kobble/signals`, `POST /api/kobble/signals/fix`, `/explore`, `/dismiss`, and `kobble-changed` events on the page's stream. Nothing to do.
- New: the Personas page (`#personas`, `#personas/<id>`): the personas with where they are, "Added by you" or "Found in usage", and their signals; New persona adds one. New endpoints: `GET /api/kobble/personas`, `GET /api/kobble/persona?id=…`, `POST /api/kobble/personas`. Nothing to do.
- New: a persona file may say its kobold's face, `face: { "hat": "phones" | "toque" | "cap" | "beret", "color": "pink" | "amber" | "blue" | "teal" | "violet" | "green" | "slate" }`; without it, the face comes from the persona's id and never changes. New persona picks one, with Shuffle. Faces show wherever a persona does; the kobold itself is drawn the same way, with its floppy cap. Nothing to do.
- Changed: an exploration's board is a real canvas: pan, zoom and drag, laid out left to right along its arrows (React Flow and ELK, as the setup canvas), arrows with short labels, and things of several kinds: the problem, what we heard, notes, choices (choose an option; Make for one without a prototype), prototypes (the live screen while one runs), diagrams (Mermaid, a widely used library, now a dependency of the dashboard) and pictures a person pastes or drags in. Each thing is a sketch (dashed) until agreed (solid green); a click switches it. Clicking a thing attaches it to what you type next. The kobold changes the board with its tools (notes, diagrams, choices and options, arrows, pointing at a thing, agreeing). `board.json` is now `things` and `links`, with the places people set; a board in the first shape is read as the new one. Pictures are kept in the exploration's `pictures/` folder. New endpoints: `POST /api/kobble/explorations/board`, `/picture`, `GET /api/kobble/explorations/picture`; `/make` takes the choice. Nothing to do.
- New: Explorations (`#explore`, Explorations in the sidebar): what is being explored, as cards with a small preview of the canvas, the personas and one line from the kobold; what waits, with Start; and "n handed off · n dropped". New exploration starts one for a team idea. One exploration is a canvas (the problem, what we heard, the question with options A, B, C, a prototype per option, notes; everything a sketch until a prototype is agreed) beside a conversation with the kobold, which changes the board with its tool while it talks. Make builds an option's prototype on its branch `proto/X-<n>-<key>`; Open runs it with the project's `prototype.start` command, one at a time; Test runs a persona test on it; Agree marks it agreed; Hand off writes `handoff.md` and makes a GitHub issue on the connected board. New files beside an exploration: `board.json`, `conversation.md`, `handoff.md`; `exploration.json` has `work` (the issue's number, or null); a persona test's `on` may be a prototype's branch. New endpoints under `/api/kobble/explorations` and `GET /api/kobble/exploration?id=…`. The old Explore page (ideas with versions, and the ideas shaped with the idea coach) is no longer in the dashboard; prototype mode and Build are unchanged. Nothing to do.
- New: persona tests. On a persona's page, Tests: "What should <name> try in the app?" and Start test; the kobold starts the product on this computer (never the live app), uses it through a headless browser (Playwright's MCP server, fetched once with `npx @playwright/mcp`) as that persona, keeps a diary of each step (what it did, what it expected, whether that happened), and files what surprised it as signals (source `test`). Each test is a file, `factory/kobble/tests/T-0001.json`, with its steps, its signals and, when it failed, why. One runs at a time. New skill `persona-test`, which `software-factory upgrade` puts beside the others. New endpoints: `POST /api/kobble/tests`, `GET /api/kobble/tests?persona=…`, `GET /api/kobble/test?id=…`. **To run one:** Claude Code on this computer, a product the factory starts with a web address, and npx able to fetch `@playwright/mcp` once.
- Changed: the dashboard is light only for now. It ignores the computer's dark setting, the Light or dark choice in Settings is gone, and the dark rules of a company's `factory/theme.css` are switched off. Nothing to do.
- Removed: the product switcher at the top of the sidebar (and in the phone menu). A factory works on one repository; Ask the kobold speaks of the factory's first product. The company's products and the setup are unchanged. Nothing to do.
- Changed: Kobble's new look: a white sidebar with "kobble" beside the kobold, the pages with a pale blue wash on the current one, the kobold's card ("Your kobold") and Settings and Workshop under it. Signals and Personas sit on the grey ground with their buttons in their header, white cards with radius 20px and pill-shaped buttons. The dashboard's font is now Inter (bundled, as before), with Bricolage Grotesque for the name. Theme variables changed: `--ground`, `--background`, `--foreground`, `--foreground-2`, `--muted-foreground`, `--faint`, `--primary`, `--blue`, `--border`, `--line-soft`, `--border-soft`, `--input`, `--ring`, `--build`; new: `--wash`, `--wash-foreground`, `--picked`, `--source-app`, `--source-usage`, `--source-errors`, `--source-test`, `--type-bug`, `--type-request`, `--type-feedback`, `--usage`, `--usage-foreground`, `--shadow-card`, `--font-name`. A company's `factory/theme.css` keeps working. Nothing to do.
- Changed: the sidebar is Signals (with the number of new ones), Explorations, Factory, then Personas, and Workshop and Settings under the kobold's card. Explorations shows Explore and Factory the board, as before, at the same addresses. Today, Customers and Products are gone from it; `#today` now opens Signals, `#customers` Personas and `#products` Workshop. Understand is no longer in the sidebar; its pages still open from the links to them. Nothing to do.

## 0.10.0 (2026-11-16)

**To upgrade:** pin `release-0.10.0`, `npm install`, `npx software-factory upgrade`. The dashboard is now Kobble: Understand, Explore with prototype mode, and Build with "did it work?". **One thing to do by hand, for prototype mode:** the company's `prototype.start` command prints a line `FACTORY_URL=<address>` with where the version runs (see the `prototype` skill). Everything else needs nothing.

- Changed: the dashboard is called Kobble, and its thin row of icons is now a sidebar: Kobble and the product at the top (a choice when the company has several), then Today, the product's pages (Understand, Explore, Build), the company's (Customers, Products) and the factory's (Workshop, Settings), with the factory's light at the bottom. On a phone it is a bar along the top whose menu opens the same list. Build is the board, Explore holds the ideas, Workshop holds the system and the add-ons; Today, Understand, Customers and Products say what will come there. Old links (`#board`, `#ideas`, `#ideas/<id>`, `#system`, `#add-ons`) still open the same place. The command, the `factory/` folder and everything else keep their names. Nothing to do.
- New: Kobble's records, the background story of a product: sources, signals, personas, customers, stories, problems, real problems, ideas, versions, the GitHub issues they became, and whether they worked. They live in a local database in the factory's folder, `factory/kobble.db` (Node's own `node:sqlite`), which never goes into git: the factory adds `kobble.db*` to `factory/.gitignore` when it makes the database. Every write is checked against the records' rules and refused, with why, when it would break one. Where problems and ideas stand, and how well a story is known, are worked out, never stored. An empty database is filled from `factory/kobble-seed.json` when the factory has one (the example company does); a real project starts empty. Nothing to do.
- New: the server reads the records for the Understand pages (`GET /api/understand`, `/api/understand/persona?id=…`, `/api/understand/story?id=…`, all of them at `GET /api/records`) and takes signals in at `POST /api/signals` (`source` and `text`; `who`, `when`, `n` and `id` optional), with the same header as the dashboard's buttons. The page's stream also tells `records-changed` events, which say which records changed. Nothing to do.
- New: `software-factory check [folder]` checks the project's records (`kobble.db` and the seed, where there are) and says each problem in a line. Nothing to do.
- New: Understand in the dashboard, in three levels with a breadcrumb: every persona side by side with their stories (`#understand`), one persona with their real problem and stories (`#understand/<persona>`), and one story scene by scene, with what shows each scene or that it is guessed, and the problem it breaks at (`#understand/<persona>/<story>`). "Add a source" takes in something that came in, pasted or from a file; the kobold sorts it, and the page shows where it went, to move it or agree. Nothing to do.
- New: the kobold's Understand jobs, run by Claude Code on this computer with the new `understand` skill: it sorts each signal that comes in (who it sounds like and why, then evidence in a story's scene, a new story, Build or answered), suggests a real problem when two or more problems of a persona point the same way, and drafts a short question about a story's guessed scenes. What it writes says `by: kobold` until a person moves it, says it looks good or confirms it. The new endpoints: `POST /api/sources`, `POST /api/understand/move`, `/looks-good`, `/confirm`, `/ask`, `GET /api/understand/signal?id=…`, `GET /api/understand/kobold`, and `kobold` events on the page's stream. `software-factory upgrade` puts the `understand` skill beside the others. Nothing to do.
- Changed: a signal can go to Build (`wentTo: { "to": "build" }`) before its GitHub issue is made; only a bug or an update goes there. Nothing to do.
- Fixed: the `software-factory` command no longer prints "ExperimentalWarning: SQLite is an experimental feature" when it opens the records. Other warnings are shown as before. Nothing to do.
- New: Explore on the records (`#explore`): the ideas, each with who it is for, where it stands and how many versions are shared, and one idea with the problem and story it is for, what the team thinks, its versions side by side with Try it, the picks (one per person per idea, by their name in git) and one action, "Send B to Build" (or "Pick one to send" on a tie). New endpoints: `GET /api/explore`, `GET /api/explore/idea?id=…`, `POST /api/explore/ideas`, `/own`, `/pick`, `/discard`, `/send`. The ideas shaped with the idea coach before stay below, as ideas from before, and open their workspace as they did; the big "What should we build next?" box is gone. Nothing to do.
- New: New idea, from a story (also "Start an idea" on a story in Understand) or from your own: the kobold writes the story it assumes behind your idea, every scene guessed and its problem assumed, with the new `explore` skill, which `software-factory upgrade` puts beside the others. Nothing to do.
- New: prototype mode (`#prototype/<idea>`): the versions of an idea, each on its branch `factory/<idea>/<key>` in its own copy in `<project>-prototypes/<idea>/<key>`, started with the company's `prototype.start` command and shown in a frame, Main beside them, "Make another version" (the kobold makes it on its own branch, never pushed) and Share, which puts a version on Explore. New endpoints: `GET /api/prototypes?idea=…`, `POST /api/prototypes/start`, `/stop`, `/make`, `/share`, and `prototypes` events on the page's stream. **To do, for prototype mode to show a version:** the start command prints a line `FACTORY_URL=<address>` with where the prototype runs; it is now also told `FACTORY_IDEA` and `FACTORY_VERSION` (and, as before, `FACTORY_BRANCH`, `FACTORY_PROJECT`, `FACTORY_COPY`; `FACTORY_CARD` only for a card). The prototype skill says so.
- New: `software-factory prototype <idea> <version>` (with `--stop` and `--remove`) runs a version of an idea like a card's prototype; `software-factory prototype list` lists both. The card form is unchanged. Nothing to do.
- New: "Send to Build" makes the GitHub issue on the connected board, with the idea, the problems and the version's branch, and the ids in a hidden mark (`<!-- factory:kobble idea=… version=… problems=… -->`); the records keep a ticket link, so the idea is in Build. The issue starts in Backlog. Nothing to do.
- New: a version may have a picture (`thumbnail`, a web address); none is needed. Nothing to do.
- Fixed: the Understand overview's persona header no longer says "based on …" after the stories; the persona's page shows what they are based on. Nothing to do.
- New: Build shows the cards Kobble knows its way: their kind (Idea · B, Fix, Update) and number, the title, what each is for (its problems, each linked to its story in Understand) or, for a fix or an update, where it came from. The Done column is called "In the app". Other cards look as before, and the board, the coach and the builder work as before. Nothing to do.
- New: "Close · did it work?" on an idea's card once it is closed, merged or in the app: the dialog shows the card, what it was for and what the team thought, a draft of what was seen since (the kobold writes it from the signals heard since, with the `understand` skill; empty when Claude Code is not there, to type in), and three answers: yes, the problem is solved; no; didn't check. The answer is saved as an outcome (with what was seen, the person's name in git and the day) and written as a comment on the issue; yes makes the problem solved and ends its story, no keeps the problem open and the idea did not work. New endpoints: `GET /api/build`, `POST /api/build/draft`, `/answer`. Nothing to do.
- Changed: the board's rules no longer finish an idea's card silently: once it is closed, its pull request merged, or it is in Done, it asks "did it work?" there until a person answers. The other rules are unchanged. Nothing to do.
- New: "Make a fix ticket" for a bug or an update sorted in Understand and sent to Build (under the signal in Understand, and on Build in "Sent from Understand"): it makes a GitHub issue in Backlog with the signal in a hidden mark (`<!-- factory:kobble signal=… -->`), and the signal goes to it. A fix has no "did it work?". New endpoint: `POST /api/build/fix`. Nothing to do.
- New: a ticket link keeps the day it was made (`on`), to tell what was heard since; earlier ones have none. Nothing to do.
- Changed: Kobble has its own look, the same on every page ([the design system](docs/reference/design-system.md)): the sidebar on a light grey ground with the kobold, the product as a tile with the company under it, the product's pages each with their colour and a small count where there is something to count (ideas being explored, tickets not yet in the app), and a card at the bottom saying what the kobold is working on or that it rests; each page in a white panel with a bar at its top, where the page's own buttons now are (Understand's "Add a source", Explore's "Open prototype mode" and "New idea", Build's "Read it again" and the new "Open on GitHub" or "Open on Jira"). Buttons are dark, cards have a hairline ring, and where a story or problem stands has its own colours. The kobold is shown as its picture wherever it speaks or works. Nothing to do.
- Changed: the dashboard's font, Onest, is bundled with it, so it no longer loads from Google Fonts and works offline. Nothing to do.
- Changed: new and changed theme variables in `packages/dashboard/src/index.css`: `--panel`, `--page`, `--foreground-2`, `--label`, `--faint`, `--blue`, `--blue-foreground`, `--tint-line`, `--tint-foreground`, `--line-soft`, `--hover`, `--understand`, `--explore`, `--build`, `--open`, `--solving`, `--solved`, `--wrong` (each with a `-foreground`), `--shadow-lift`, `--shadow-current`, `--shadow-panel`; `--primary` is now the dark of the buttons and `--tint` a fixed faint blue. A company's `factory/theme.css` keeps working; one that set `--primary` to its brand colour now colours the buttons with it. Nothing to do.
- New: Ask the kobold, at the top of every page: a question about the people who use the product, answered by the kobold from the records (read only, with the `understand` skill), in a panel under the field. ⌘K (Ctrl+K) goes to it. New endpoint: `POST /api/understand/question` (`question`), answered with `answer`; the job shows as `answer` in the kobold's jobs. Without Claude Code it says so, as elsewhere. Nothing to do.
- New: Settings, Light or dark: System (the computer's setting, as before), Light or Dark, kept in that browser. It applies to a company's theme too, as long as the theme's dark colours sit in `@media (prefers-color-scheme: dark)`, as the theme check asks. Nothing to do.
- Changed: Understand is simpler. Each level asks one question under its title ("What’s new to look at?", "Is this the real problem for <name>?", "Is this how it happens? What is still guessed?"). The real problem lives only on the persona: the story page no longer shows "What’s behind it" or the real problem behind it, and the persona's real-problem card no longer lists the problems behind it. A story is told as a short paragraph, one sentence per scene and what they do instead last: the one where it breaks marked, guessed ones muted, seen ones with a small mark that shows what was said and where. Scene labels ("Find", "Pay") are no longer shown anywhere, and the seen/guessed squares are gone: the story page says "3 of 4 parts seen · 1 guessed", with Ask beside it, and lists the signals the kobold put in it or at its problem that nobody has looked at, with Looks good and Move. Where a story's problem stands is now its stage, a small pipeline the same on every card and beside the story: Heard (or Assumed, for a problem assumed from an idea) → Trying ideas → Building → In the app → Solved, or Didn't work at the end; beside the story every step is named, with a line of why ("In Build as #138", "Closed by Luca on 14 Nov: it worked"). A story that didn't hold stays crossed out, with no pipeline. The coloured state pills are gone from Understand. Nothing to do.
- New: one stage vocabulary across Understand, Explore and Build, drawn by one small stepper. An idea on Explore shows its stage (Idea → Versions → Picked → Building → In the app → Worked, or Didn't work) in the list, with the number of versions beside it, and in full on its page with a line of why ("B has the most picks", "In Build as #144", "Closed by Pia on 16 Nov: it worked"). A card from an idea on Build shows the end of that pipeline (Building → In the app → Worked) under it, with who answered and when; "Close · did it work?" stays. The core's `derive` also has `ideaStages`, with `IDEA_STAGES` and `IdeaStage` exported; `GET /api/explore` gives each idea `stage`, and `GET /api/explore/idea` gives `stage` and `answer`. Nothing to do.
- New: the core works out the stage each problem is at, never stored: `derive(records, inApp)` has `stages` beside `problems` (which is unchanged), with `PROBLEM_STAGES` and `ProblemStage` exported; `inApp` (optional) names the issues the connected board shows closed or in its last column. Solved when a ticket for it worked; In the app when a ticket not answered yes or no is closed, in the last column or answered "didn't check"; Building when one is open; Trying ideas when an idea for it is explored; Didn't work when a ticket was answered no or an idea did not work and nothing else is under way; Heard (or Assumed) otherwise. Nothing to do.
- Changed: `GET /api/understand` and `/api/understand/persona` give each story `stage` and `trying` (the titles of the ideas for its problem still being explored, and the issues for it waiting for "did it work?"); `GET /api/understand/story` gives `stage`, `trying` and `answer` (the last "did it work?" for its problem), and no longer `realProblem` or `alsoBehind`. Nothing to do.
- Changed: the `understand` and `explore` skills tell a story as short sentences with their subject, with no label before a scene, and name a story as a situation and its problem as the obstacle, never in the same words. The kobold's tools no longer take a scene's `where`; scenes written before keep theirs, unseen. The example company's stories and problems are named that way. `software-factory upgrade` puts the new skills in place. Nothing to do.

## 0.9.1 (2026-11-09)

**To upgrade:** pin `release-0.9.1`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand. (`v0.9.0` was tagged with the wrong version number inside and never released; use 0.9.1.)

- New: the builder can end a session with `STATUS: continue`: the agreed scope is not finished and nothing blocks it. The factory then starts the next session on the card's branch, which carries on from the run file, with no question to the owner and no pull request for part of the work. It gives up (a draft pull request, the card waits in In progress) when two sessions in a row add no commit, or after twelve sessions in all. A short "progress" note goes on the card every third session.
- Changed: the builder guide (`board.md`, "Building") says to stop only for a real problem that only the owner can solve (an account, a credential, a purchase, a decision that changes scope, data or what people see, a contradiction in the plan); size, effort and risk are not reasons to stop. Steps in a plan are an order to build in, not places to stop, and a small decision the plan leaves open is decided and written into the run file instead of asked. Before this, a large card made the builder stop with a question although nothing was wrong.

## 0.8.1 (2026-11-08)

**To upgrade:** pin `release-0.8.1`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand.

- Changed: the `plan` skill agrees a card that already holds a complete spec (the request, the scope, the checks, what is out of scope) as it is, with no coaching steps: the coach writes the card's own text as the plan with `card agree`. The owner's writing the spec, or moving the card to Ready, is the agreement, so such a card is no longer sent back to Planning for lack of an agreed plan.

## 0.8.0 (2026-11-08)

**To upgrade:** pin `release-0.8.0`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand. The new `prototype` skill is put in `.claude/skills` and `.agents/skills` by `software-factory upgrade`. A project that already has a skill of its own called `prototype` keeps it (the factory never overwrites a skill it did not put there): delete that folder, then upgrade, to take the core's.

- New: the `prototype` skill: how the coach makes, runs and shows a clickable prototype of a card in the real product, in a copy of the code of its own. The `plan` and `factory` skills link to it.
- New: `software-factory prototype <number>` makes the card's copy (a git worktree on `factory/issue-<number>`, in `<project>-prototypes/`, beside the project) and runs the project's own start command in it. `--stop` and `--remove` stop it and delete the copy (the branch stays); `list` shows the copies; other options go on to the start command. The commands are named in the company file:
  `"prototype": { "start": "…", "stop": "…", "remove": "…" }` (`stop` and `remove` are optional). Each runs in the copy with `FACTORY_CARD`, `FACTORY_BRANCH`, `FACTORY_PROJECT` and `FACTORY_COPY` set. Without `start`, the copy is made and nothing runs in it.

## 0.7.1 (2026-11-08)

**To upgrade:** pin `release-0.7.1`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand.

- Fixed: a card could not be built while its prototype was still set up on
  the card's branch in another working copy. The build failed with
  "'factory/issue-N' is already used by worktree at …" and the builder tried
  again, over and over. Before the builder takes a card's branch, any other
  copy holding it is now detached at the commit it is on. No file changes
  and nothing running there stops.

## 0.7.0 (2026-11-08)

**To upgrade:** pin `release-0.7.0`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand.

- New: the Settings tab has an "AI model" group. The model typed there
  (`opus`, `sonnet`, a full model id) is used by every Claude Code run the
  factory makes: the coaches, the builder and the card coach. Empty, which
  is the default, keeps the account's own default, so nothing changes until
  someone sets it. It is saved in `settings/factory.env` in the factory's
  folder and read again on each run, so a change applies to the next turn.
  It does not affect Codex. Nothing to do when upgrading.

## 0.6.2 (2026-11-08)

**To upgrade:** pin `release-0.6.2`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand.

- Fixed: when the factory was closed or restarted while the builder was on a
  card, the next build reset the card's branch to GitHub's copy and threw
  away what the builder had committed but not yet pushed, and its unsaved
  changes. A build now carries on with the copy's own branch when it holds
  everything GitHub's has. When GitHub's branch went another way, GitHub's
  is taken and the copy's commits are kept on `<branch>-kept-<commit>`.

## 0.6.1 (2026-11-08)

**To upgrade:** pin `release-0.6.1`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand.

- Fixed: the builder could not save its work in a project whose `.gitignore`
  ignores `.env` (git stopped with "The following paths are ignored"), so
  every build failed at the end and its next try reset the copy. Saving a
  prototype had the same fault. Both now add everything the plain way and
  take any settings file out again (`stageAllButSettings`, in the core's
  API).

## 0.6.0 (2026-11-08)

**To upgrade:** pin `release-0.6.0`, `npm install`, `npx software-factory upgrade`.
The upgrade moves files (below) and sets the links; then sort the project's own
docs into the knowledge base's sections, which `npx software-factory check-docs`
lists.

- **One space for what a project knows**: the knowledge base is the project's
  `docs/`, beside its own documentation, no longer `factory/context/`. Setup
  copies the sections in without overwriting a page that is there, and the setup
  coach sorts the project's own pages into them. `check-docs` checks `docs/` as
  one knowledge base: every page in a section with its "**Type:**" line.
- **Products describe themselves next to their code**: `product.json` and
  `BLUEPRINT.md` sit in the product's folder, and `factory.json` lists the
  folders (`"products": ["apps/web", …]`); `code` is no longer needed. A factory
  from before 0.6.0 still loads the old way until it is upgraded.
- **The upgrade moves both**: `factory/context/*` into `docs/`, each
  `factory/products/<id>/` next to its code, and every Markdown link and written
  path to the old places is set to the new ones. A page that is already in
  `docs/` with other text stays where it was, for the owner to merge.
- **Long pages get a hint**: a knowledge-base page over 1,200 words is named as
  one to split (a screen or two each); a hint doesn't fail the check.

## 0.5.3 (2026-11-08)

**To upgrade:** pin `release-0.5.3`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand.

- **A builder that stops halfway carries on.** When the builder's turn ends
  without its status line (it left the tests running and meant to look
  later), the factory goes on in the same conversation, up to twice, telling
  it to run its checks in the foreground, fix what fails and finish. Before,
  the card went back with "stopped without saying how it ended".
- **When the builder gives up, its work goes up as a draft.** Still red
  after three rounds of fixing, or unable to finish: the factory opens (or
  updates) a draft pull request with what it did and what is wrong, and the
  card waits in In progress for a comment. Before (0.5.1), there was no pull
  request, so the work could not be seen. A question for the owner still
  sends the card back to Planning.
- The factory skill's `board.md` says that a turn is the whole job: nothing
  keeps running after it.

## 0.5.2 (2026-11-08)

**To upgrade:** pin `release-0.5.2`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand.

- **"Method" is now called "skills"**, the word for what it is: the package
  `packages/method` (`@software-factory/method`) is `packages/skills`
  (`@software-factory/skills`), and the docs, the upgrade's report ("Refreshed
  the skills") and the skills' own text say skills. Nothing else changes.

## 0.5.1 (2026-11-08)

**To upgrade:** pin `release-0.5.1`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand: the upgrade brings the factory skill's new `board.md`.

- **No pull request while a check is red.** The builder gets up to three
  rounds to fix what the factory's own checks find (one before). If they are
  still red, the branch is pushed but no pull request is opened: the card
  stays in In progress with what fails, and a comment lets the builder try
  again. Before, it opened a draft pull request.
- **Every red check is the builder's to fix**, also one that already failed
  before its change (a broken or out-of-date test is code like any other).
  Only what cannot pass in code (an account, a setting, a decision) becomes
  a question in the card, which goes back to Planning.
- **The report shows what failed**: the lines that name a failure, then the
  check's last lines. Before, only its last lines, often all passing tests.

## 0.5.0 (2026-11-08)

**To upgrade:** pin `release-0.5.0`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand: the upgrade names the new check command in `AGENTS.md`.

- **Cards depend on and replace each other**, on GitHub's own relations:
  `card depends <n> --on <m>` (GitHub's "blocked by"), `card replace <n> --by <m>`
  (closed as not planned, with a note on both, so it stays findable). `card show`
  lists a card's relations, `card list` marks the cards that wait, and the builder
  doesn't start a card before the cards it depends on are done.
- **Something noticed becomes a card**: `card new … --found-while <n>` links the new
  card and the one being worked on, both ways. The `factory` skill says to propose a
  card for anything noticed outside the current work, and the board's builder names
  such things under **Noticed** in its answer.
- **Plans keep their shape**: the agreed plan stays current and short, with what was
  tried and dropped under **Tried**; a plan with a prototype says what in it is final;
  a plan that outgrows its card asks whether to split it; before agreeing, the board's
  other cards are checked for what this plan depends on, replaces or changes. A run
  is committed when its plan is agreed and when it ends.
- **AI behaviour is prototyped with the real agent**, at least once, when a card is
  about what an agent says, asks or builds.
- **`software-factory check-docs`** runs the knowledge base's checks in a project
  (the skills and `AGENTS.md` name it).
- **Commands answer and end**: `help`, `--help` and a word that is no command or
  folder print the help instead of starting the factory; GitHub calls give up after a
  minute and git never waits for a password; anything unexpected is said in a line
  instead of a crash; the cards the builder takes are called **Ready** everywhere.
- **Tests never reach the real repository**: git's variables from a hook
  (commit, push) are removed before the tests run, so the tests' own git
  repositories stay in their temporary folders.
- Fixed: `software-factory upgrade` pinned the core in devDependencies even
  when the project keeps it in optionalDependencies, so the project ended
  up with two pins. It now pins it where the project keeps it.

## 0.4.1 (2026-11-08)

**To upgrade:** pin `release-0.4.1`, `npm install`, `npx software-factory upgrade`. Nothing to change by hand.

- **The coach and the builder are switches with words**: a panel on the
  Board tab, a row each, with what it does and what it is doing now
  (shadcn's Switch), instead of two buttons that said "on" or "off".
- **A card opens**: a panel with its stage, links to the card and its pull
  request, and, while the coach or the builder works on it, its steps so
  far. On the card itself a step shows in a few words ("Running a
  command"), no longer the whole command running out of the card.
- "Read it again" beside where the work is tracked reads the board now.

## 0.4.0 (2026-11-08)

**To upgrade:** set `"software-factory":
"github:danielplan/software-factory-core#release-0.4.0"` in the project's
devDependencies, `npm install`, then `npx software-factory upgrade`. Nothing
to change by hand: the upgrade brings the factory skill's new guide
(`board.md`).

- **The Board tab shows the connected board's cards**, every one in the
  column of its stage, read every minute and when asked (the button beside
  the switches). Before, it showed only the factory's own ideas, so a
  GitHub board looked empty.
- **The builder** (what the docs called the runner): switched on on the
  Board tab, it builds the cards in Ready one at a time, on the card's
  branch `factory/issue-<number>` in a working copy of its own, through the
  factory's skills. The factory then runs each changed product's verify
  command itself, gives the builder one round to fix a failure, pushes, and
  opens a pull request (a draft that says so when the checks still fail),
  and moves the card to Review. Comments on the card or the pull request are
  answered on the same branch. A card without an agreed plan, or with a
  comment after it, goes back to Planning with the reason; a question goes
  back to Planning; an interrupted build resumes; merged or closed cards go
  to Done. It never merges. The rules are in `server/src/builder/decide.ts`.
- **The coach in the cards**: switched on beside it, the coach answers what
  the owner writes on a card in Planning, one question at a time, in a
  read-only copy, and writes the agreed plan into the card.
- **The factory skill's `board.md`**: how the coach and the builder work
  through the board (status lines, what each stage asks).
- A working copy can continue a branch kept on GitHub
  (`Workspace.prepareSharedBranch`).
- The factory's comments carry a hidden mark naming the kind of note, since
  the owner and the factory may post with the same account.
- Less space above every tab.
- `software-factory card` says "the builder" for what it called the runner.

- **A working copy runs beside the owner's checkout.** Loading a factory
  for a working copy (`loadFactory(root, available, { folder, data, shift })`)
  moves each product's port by the copy's shift and adds the settings the
  product gets in a copy: `copyEnv` in its `product.json`, where
  `{port:<id>}` is a product's port in the copy, `{copy}` the copy's folder
  and `{data}` a folder for its own data outside its code. A copy's own
  `.env` files are made from the project's `.env.example` (never the
  owner's) and are never committed; changes to the examples are.
- Fixed: settings files in a working copy were not found (Node's glob does
  not match `**/.env*`), and the `.env.example` files would have been
  taken out of a copy.

## 0.3.0 (2026-11-06)

**To upgrade:** pin `"software-factory":
"github:danielplan/software-factory-core#release-0.3.0"` in the project's
devDependencies, `npm install`, then `npx software-factory upgrade` (it
pins the core itself from now on).

- **The core installs from this repository.** A release is the core built
  as one package (`scripts/build-release.mjs`: compiled to JavaScript, its
  packages bundled, the dashboard built) on the `release` branch, tagged
  `release-<version>` (`npm run release -- --push`). Setting up a factory
  and `software-factory upgrade` pin it in the project's `package.json`;
  everyone with the project runs it with `npx software-factory`
  ([releasing the core](docs/releasing.md)).
- The method's skills and the agents' ground rules call `npx software-factory`;
  a migration changes the line in a factory's `AGENTS.md`.
- **An `upgrade-factory` skill** in the method: a coding agent runs
  `software-factory upgrade`, does the small changes it lists under "Needs
  you", asks about the ones that are the owner's choice, checks again and
  hands the result over for review. Every factory gets it with its next
  `software-factory upgrade`.

## 0.2.0 (2026-11-06)

**To upgrade:** run `software-factory upgrade` in the project, review the
changes, commit them.

- **`software-factory upgrade`** brings a factory to the core it runs on:
  the migrations of each release since its version, the method's skills
  and the kits' MCP servers refreshed, the version written into
  `factory.json` (`core`), and the checks. A factory without a version is
  on 0.1.0.
- A product's own program counts as running when it listens on its port
  from its own folder, also where the health check cannot reach it (a
  development server on IPv6 only), instead of showing as stopped or as
  "used by another program".
- **Planning in a coding agent, from the board's cards.** `software-factory
card` (list, show, new, move, comment, agree) works with the cards of
  the connected GitHub board from the project, for the coding agents and
  the owner (`server/src/cards/`). `agree` writes the agreed plan into the
  card (between marks, with the prototype's branch and who agreed when),
  refuses a prototype branch that is not pushed, and moves the card to
  ready, where the factory's runner (on whichever computer runs it) takes
  it. The `factory` skill works from the board; the `plan` skill plans a
  card with prototypes on its branch (`factory/issue-<number>`) and hands
  it on when the person agrees. A company upgrading gets the skills and the
  line in `factory/AGENTS.md`.
- **The method's skills reach the coding agents.** Making the factory's
  folder puts the method's skills (factory, plan, build-test-first,
  review-structure, show-result, update-context) in the project's
  `.claude/skills` and `.agents/skills`, so planning and building with the
  method works in Claude Code and Codex too. A skill folder the factory put
  there is replaced by a newer one; one of the project's own with the same
  name is left alone (`server/src/install-skills.ts`). A factory made
  before gets them on its next upgrade.
- The factory takes in every card on a connected board unless the owner
  asks for only the cards with a label (`*` is the default label, before
  `factory`). Boards connected before keep their label.
- **Another copy of the project is not taken for this one.** When a part's
  port is in use, the launcher asks which folder the program on it runs in
  (lsof, on macOS and Linux); a program from another folder (a second
  working copy, a worktree) is a problem that names that folder, not "running,
  started outside the factory". A port counts as taken on IPv4 or IPv6, so a
  development server listening only on ::1 is noticed too.
- **A part can start with what uses it** (`start: "with"`): it has no
  buttons of its own and starts when a part that depends on it starts (a
  TypeScript package's watch build). System's headline leaves it out and
  says when only some products run. A company whose package part was
  `auto` gets `with` from the kit.
- On Settings, changing where work is tracked starts from the board
  connected now: its step is done, and its repository, board, columns and
  label are already chosen.
- **Kits bring their MCP servers** (`mcp` in `defineKit`): written into the
  project's `.mcp.json` when a product of their kind is added, only where
  the project has no server of that name (`server/src/kit-servers.ts`). The
  SvelteKit kit brings Svelte's own (documentation and the autofixer), and
  its rules say to use it.
- **A TypeScript package kit** (`typescript-package`): shared code given out
  as a package (exports, main or types; TypeScript; no framework; no start
  script), checked with its own check or its build, and kept built by its
  watch script while the others run.
- **A SvelteKit web app kit** (`sveltekit-app`): it recognises a SvelteKit
  app by its packages, runs it with Vite's server, checks it with its check
  script (svelte-check) and makes a new one with SvelteKit's own starter
  (`sv`); its rules are the usual SvelteKit way and its lessons. A company
  with a SvelteKit app described as Other code can change the product's
  kind to `sveltekit-app` and add the kit to `factory.json`.
- The dashboard is wider (up to 1600px), so the board's six columns have
  room.
- **Only the tracker in use is on.** Choosing where work is tracked switches
  the other built-in trackers off (the factory's own board: all of them);
  Settings still offers each, and switches one on when it is chosen.
  Settings shows the connected board (a link, the label, which column each
  stage is) and folds the choice away under "Change where work is
  tracked".
- **Add-ons in two parts**: "In use" (the board work is tracked on, the
  add-ons on, the kits of the products) and "Not used", greyed. A board is
  changed on Settings, not added here.
- **The Board** fits all six stages in one row and says where work is
  tracked, with a link.
- **Setup is kept.** The setup conversation, its map, whether the factory
  is being built and Claude Code's conversation are kept in
  `factory/setup.json` once something was said or drawn, so setup goes on
  where it was when the factory is started again, and the project keeps a
  record of how its factory was set up (`coach/setup-record.ts`).
- **The GitHub board is set up in setup, with the owner.** The setup coach
  hears where the code is on GitHub and the boards there (their columns and
  cards), agrees on one with the owner, or a new one, and while building
  `configure` takes `board`: it connects that board, or makes one linked to
  the code with the factory's stages as its columns, and adds the stages'
  missing columns to a board that is there only when the owner agreed,
  keeping its own (`add-ons/github/board-setup.ts`, through
  `connect/tracker-setup.ts`; the session's `coach.trackers`). A board
  connected in setup needs no step after opening.
- The coaches' replies are shown as Markdown (paragraphs, bold, lists,
  links, code, small tables) with `react-markdown` and `remark-gfm`; the
  owner's own words stay as typed.
- **Knowledge lives in the repository.** The agents' ground rules
  (`packages/method/templates/AGENTS.md`) say what is known goes into the
  knowledge base, a blueprint or a decision, never only into an agent's own
  memory; the setup coach writes notes it found in such a memory into the
  knowledge base. A GitHub board is the factory's standard place for work:
  the setup coach recommends it when the code is on GitHub. A company
  upgrading adds the rule to its `factory/AGENTS.md`.
- The setup coach draws what the project's own documentation says as
  confirmed, naming where it says so, so only its own guesses stay open;
  each rule starts with the part it is about; pictures only where they
  show clearly what people see.
- Opening a factory built in setup asks where work is tracked only when
  setup chose a GitHub or Jira board that is not connected yet; the
  factory's own board needs no step. The setup coach's theme takes the
  app's colours as they are, never shifting a brand colour.
- **Building writes the factory's look.** When the project has an app
  people see, the setup coach writes `factory/theme.css` from it while
  building, and the factory's checks look at the theme: the colours text
  sits on, set for light and dark as plain colours and readable (WCAG AA,
  4.5:1), and the files it names (`theme-check.ts`, with postcss and
  culori). The setup coach asks once which add-ons the owner wants, and
  draws arrows only inside an area.
- **Setup draws the whole picture first.** The coach's guide names what
  building needs (what the factory builds, what each must keep, what the
  project is, how work will go), and the coach drafts all of it in its first
  turn, then asks only about weak guesses. **Build the factory** appears
  only once the coach says the map is ready (`draw` takes `ready`; the
  draft keeps it).
- **The map is laid out area by area**, then the areas together, so cards and
  areas no arrow joins are packed in rows instead of one long line; the
  view is centred in the room beside the coach.
- **The setup coach starts from what is there.** In a project with code,
  its first message carries the project's history (from git: how long, how
  lately, how many people, the latest commits) and lists the documentation
  already in it (`packages/server/src/coach/project-facts.ts`). Its guide has
  it read that documentation first and link to it instead of writing it
  again, decide how real the project is from evidence and name it, draw the
  pieces of code the factory will build with their kind and checks, keep one
  topic per area, label every arrow, and give rules and questions none. The
  knowledge base's index lists the project's own documentation, which stays
  the source for what it covers.
- **The factory's look** is calmer: a light neutral ground, white cards with
  a hairline, one accent colour (an indigo), the coach's messages beside its
  orb; a guess on the map is a plain card, and an agreed one has a tick
  (no more dashed borders). Rows on the map have room for their arrows.
- **A company's theme**: `factory/theme.css`, when there is one, is loaded
  after the dashboard's own styles, so its variables win; it may use the
  project's own fonts and pictures through `/api/theme/file`. The font is the
  variable `--font-body`.
- **A Planning stage** between Backlog and To do: work whose plan is talked
  through with the owner in its conversation until it is agreed (for work
  that did not come through Ideas); To do stays the owner's go-ahead to
  build. Connecting a board suggests a column for it from names such as
  Planning or Refinement. A `board.json` written before reads Planning as
  no column; a company that wants one picks its column on Settings.

- **Setup is planned on a map, then built by the coach.** The setup coach
  reads the project with Claude Code's own tools (read-only while planning)
  and has two tools of its own: `draw`, for the map it plans with the owner
  (small cards in areas, arrows, pictures from the project, rules and
  questions marked, laid out along the arrows with ELK), and `configure`,
  for the factory's own settings once the owner presses **Build the
  factory** (the project, its products, the tracker, add-ons, settings and
  tools to install, each checked as it is saved). Building, it may write in
  the project (never `.env` files): it writes the blueprints and the
  knowledge base's pages itself. The owner then presses **Open the
  factory**. Routes: `/api/setup/say`, `/api/setup/draft` (the owner moves
  or takes off a card), `/api/setup/build`, `/api/setup/open`. Gone: the
  coach's earlier drafting tools, the setup form, `POST /api/setup/make`,
  `POST /api/company`, `POST /api/products`, `POST /api/company/tracker`,
  `GET /api/folders`, `POST /api/setup/detect` and Mermaid.
- The setup page is plain: at first only the coach's question; then the
  canvas and the conversation beside it. A card shows only what it says; it
  is dragged anywhere or taken off, and changed by telling the coach. A
  folder button opens a project to start from, which the coach reads before
  asking anything.
- **Voice**: the owner can press Talk and speak with a coach. Whisper in the
  browser writes their words down; the answer is read out as it is written
  (Piper in the browser, else the browser's own voice); saying "stop"
  interrupts it. English, German, Italian, French and Spanish. The speech
  model is downloaded once (about 0.8 GB); what is said stays on this
  computer.
- **Ideas**: the owner starts an idea with a sentence and works it out with
  the idea coach (the method's `guides/idea-coach.md`) on a map, as in
  setup; the coach gives it a short title (`draw` takes `title` on an
  idea's map). **Ready** puts the agreed plan on the board's Backlog. Each
  idea is a file in the factory's `ideas/` folder. Both coaches share one
  conversation class (`coach/talk.ts`).
- **The dashboard** opens on the **Board**: a line saying what the factory
  is doing now, then the work in its columns. Ideas, System (the products,
  with Start all and Stop all, then the factory itself) and Settings (one
  card per topic, listed at the side) are on a rail of icons. The
  **Products** tab, the factory overview and the addresses are gone. One
  font, shadcn components, one colour per stage, a soft gradient in the
  light theme.
- **Where work is tracked**, chosen right after the factory is opened (the
  state says `onboarding` until then) and again on Settings: the
  **factory's own board** (tracker `none`, nothing to connect), a **GitHub
  board** through the GitHub CLI (installed if missing, signed in in the
  browser with a one-time code, repository and board picked from lists), or
  **Jira Cloud** with an API token (checked against Jira, which lists the
  projects). Connecting picks the label of the work the factory takes in
  (`factory` by default, `*` for all) and matches the board's columns to the
  factory's stages, suggested from their names. `POST
/api/connect/own-board` keeps the factory's own board.
- **GitHub and Jira are add-ons**, the first real ones: each is an
  extension (`tracker: true`, built in and on unless switched off with
  `without`) with its own routes at `/api/add-ons/<id>/…` (answered only
  while it is on) and its own connecting steps on the page
  (`packages/server/src/add-ons/`, `packages/dashboard/src/add-ons/`). The
  company's `tracker` is `none` or the id of an add-on that tracks work;
  the factory's checks say so when it names none that is on. `startServer`
  takes `addOns` instead of `connectors`. The `trackers` extension is gone.
- An **Add-ons** page on the rail, laid out as a store: tiles with each
  one's logo (from `simple-icons`) on shelves by what they are for (where
  work is tracked, more abilities, kinds of product). An add-on is added or
  removed there (`POST /api/add-ons` with `id` and `on`, written to
  `factory.json`; the add-on that work is tracked with cannot be removed),
  with its settings folded in while it is on; a kit shows the products it
  knows. The connect choices show the same logos. The state
  lists every add-on (`addOns`, on or off) instead of `trackers`, and each
  product says its `kit`. Settings keeps where work is tracked and the
  settings no add-on has.
- **One stage vocabulary** for work everywhere: `draft`, then `backlog`,
  `todo`, `doing`, `review`, `done` (`STAGES` in the server's `api.ts`).
  Ideas marked `ready` before are read as `backlog`.
- **`board.json`** in the factory folder keeps which board is connected,
  by tracker add-on: the label, the column for each stage, and what the
  add-on needs (the GitHub repository and board, or the Jira site, email and
  project). Only Jira's API token stays in the
  settings (`settings/jira.env`, the Jira add-on's group); the GitHub CLI keeps
  its own sign-in. **A company that connected a board on an earlier build
  of this branch connects it again** (the `GITHUB_*` and `JIRA_*` settings
  besides `JIRA_TOKEN` are no longer read).
- Kits: the **Other code** kit (`otherCode`) recognises any project by its
  project files (package.json, pyproject.toml, go.mod, Cargo.toml and
  others) and runs the start command it can tell. A kit can be a fallback
  (`fallback: true` in `defineKit`): it takes a folder only when no other
  kit finds a product there or below.
- The coach installs what the factory needs: tools on this computer (such as
  Git and the GitHub CLI) with the system's package manager (Homebrew,
  winget), or tells the owner how; add-ons go into `factory.json`. `Session`
  takes `tools` (`computerTools()` in the command).

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

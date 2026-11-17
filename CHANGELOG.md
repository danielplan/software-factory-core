# Changelog

What changed in each release of the core, and what a company has to do when it
upgrades. Newest first. Versions follow [semantic versioning](https://semver.org/):
a major version may need a company to change something, and says what.

## Unreleased

- New: Overview (`#today`, until now "coming soon") is the first page, where the dashboard opens (it opened on Build; the board is one click away at `#build`, unchanged). It shows what the kobold is doing; "Needs you", what waits for a person by name, the most pressing first ("Did it work?", "Review", "Send to Build", "Choose a version", "Check 14 new things people said"); and side by side Discovery, the problems still open with who has them and their stage, and Build, the cards not yet done with their column (without a board read, the ideas being built), five of each with a way to see all. Nothing to do.
- New: Product (`#products`, until now "coming soon"): what the factory is connected to and what it builds with, as a map on a dotted canvas that you can move and zoom. The project is on the left (its name and branch). Then each product follows the ones it needs, joined by arrows that move while the product they lead to runs; each card shows its kind, whether it runs, and a few things it is built with, read from its own files (its `package.json`'s known packages, and files such as `tsconfig.json`, `go.mod` or a `Dockerfile`); one with a problem has a red edge. Clicking a card shows its details beside the map: what it is and is built with in groups (language, interface, server, data, look, checks, tools), who uses it, Start, Stop, Try again and Open, and what went wrong in plain words; the project's card shows its folder, its branch and where it is shared, never with a password written in the address. Start all and Stop all are at the top. This was Workshop's System. New endpoint: `GET /api/product`. Nothing to do.
- New: Chat (`#chat`): talk with the kobold as in any chat. Say something you would like to improve and it asks who it is for (not when there is one person), then writes it up as an idea on Explore, as "New idea, from your own" did; ask a question (it ends with "?") and it answers from the records. It uses the existing `POST /api/explore/own` and `POST /api/understand/question`. Nothing to do.
- Changed: Chat looks and works like a chatbot. Empty, it shows a big field in the middle of the page under the kobold; with the first message the field slides to the bottom, where it stays while the conversation scrolls above it. The kobold's messages carry its picture, three moving dots show while it thinks or writes, the people to choose from are buttons, and a finished idea shows as a card that opens it; "New chat" starts again. Nothing to do.
- New: files in the Chat: pictures, PDFs and text files (five at most, 7 MB each), attached with the paperclip, dropped on the field or pasted. The kobold gets them with the question or the idea: a text file in its prompt, a picture or a PDF to open with its Read tool. They are kept in `factory/attachments/`, which the factory adds to `factory/.gitignore` with the first one, so they never go into git. New endpoints: `POST /api/chat/attachments`, `POST /api/chat/question` and `POST /api/chat/idea` (like `/api/understand/question` and `/api/explore/own`, with `files`). Nothing to do.
- New: steering the kobold. While it answers or writes an idea from the Chat, what you send next stops it and asks again with what you added, marked "Steer". New endpoint: `POST /api/chat/stop` (`job`). Nothing to do.
- New: the core's `RunOptions` has `stop`, an `AbortSignal` that ends a Claude Code run: Claude Code is closed and the run ends as not done. Nothing to do.
- Changed: the Chat is in the dashboard's language, and so is the kobold: a question is answered, and an idea written, in it. `POST /api/chat/question` and `/idea` take an optional `language` (`en`, `it`, `de`, `fr`, `es`). Nothing to do.
- Changed: the voice's language starts as the dashboard's language (Settings, Language) until you choose another one beside End call; it was the browser's. Nothing to do.
- Changed: Understand speaks the dashboard's language and in plainer words: "what people said" instead of signals, "steps confirmed" instead of parts seen, "what really matters" for a person's real problem; lists and today's date follow the language. Nothing to do.
- Changed: Build's columns reach down to the end of the page and follow what appears above them (the top bar, a problem, "did it work?"), so the page no longer scrolls or leaves a gap; the board's last stage is called "In the app" everywhere, including when connecting a board. Nothing to do.
- New: the dashboard speaks English, Italian, German, French or Spanish: Settings has a Language choice that changes every page at once and is kept in this browser; until one is chosen, the browser's own language is used when it is one of these, else English. The words are in `packages/dashboard/src/i18n/locales/`, one file per part and language, with i18next (and react-i18next); a test checks that every language says everything English says. What people and the kobold wrote (stories, ideas, cards) and what the server writes itself stay as they are. Nothing to do.
- Changed: one type scale everywhere, tighter (`text-title` 26px, `text-section` 16px, `text-item` and `text-body` 14px, `text-note` 13px, `text-tag` 12px, in `packages/dashboard/src/index.css`), and the font Geist, bundled, in place of Inter. Less to read on every page: no lines under the page titles, no hints under group headings or explanatory lines inside cards; where a person may need an explanation it is on a small (?). Overview's parts, Settings (whose add-ons and kits are two plain shelves), People, the Check-up (one line and a button), Explore (an idea's card says what is next only when its stage doesn't), the idea's dialog, New idea and prototype mode's side panel all say less. Nothing to do.
- Changed: when part of the factory can't start, Product's icon at the bottom of the sidebar has a red dot (and the phone's top bar says "Something needs you"), leading to Product. Nothing to do.
- New: Check-up (`#checks`, reached from People): one click and the kobold reads each product's code, read only (it changes and runs nothing), looking for what could go wrong for the people who use it: bugs, errors, things that are hard to use or to reach, data or access at risk, slow paths. Each finding says how serious it is, what happens to a person, how to fix it and where in the code it is (the file must exist, at most fifteen per check), in the dashboard's language; a person sends it to Build (a bug from "The kobold's check-up" in the records, and a fix ticket when a GitHub board is connected) or sets it aside. It cannot run the product or its tests, so problems that only show while it runs are out of its reach. The last check of each product is kept in `factory/checks.json`, which the factory adds to `factory/.gitignore`. New endpoints: `GET /api/checks`, `POST /api/checks/start` (`product`, `language`, both optional), `/stop`, `/dismiss` and `/send` (`product`, `finding`). Nothing to do.
- New: the `check` skill, the kobold's method for a check-up. `npx software-factory upgrade` puts it beside the other skills in `.claude/skills` and `.agents/skills`. To do: upgrade, to have it in the project.
- Changed: the kobold, Kobble's mascot, is drawn sharp at every size (no longer a small picture), without its ears, with its blue wizard hat: in the sidebar, beside messages, on the empty pages, in the animated opening and Check-up, and as the browser tab's icon (`kobold.svg`; `kobold.png` stays as a fallback). Nothing to do.
- Changed: each persona has its own little kobold, chosen from their name and the same everywhere: the kobold's body and face with a hat of its own (tall, short, pompom, star or floppy, in the persona's colour) and sometimes a scarf, a bow or glasses, in place of the coloured letter. Nothing to do.
- Changed: the kobold is also a little animated character, drawn in the dashboard with volume: the dashboard opens with soft glows in its colours and the kobold running on a track that slides under its feet, with a thin bar, all fading away with a slight zoom when the factory is ready; on the empty Chat it drops in with a bounce and then breathes and blinks; the Check-up's kobold idles and thinks while it works. Beside the Chat's messages it is the kobold's icon. Nothing moves with reduced motion. Nothing to do.
- Changed: Explore groups the ideas by step: Plan (no versions yet, with the card to start a new idea), Prototypes (versions to try and vote on), Handed off (sent to Build, in the app or worked) and Dropped (it didn't work), each with its count and a line saying what it holds; a step with no ideas is not shown, except Plan. Nothing to do.
- Changed: in Understand, each new thing people said has three one-click choices: Fix (it goes straight to Build as a bug, and becomes a card there when a GitHub board is connected), Explore (a new idea from its story) and Dismiss. Above them, it says when its problem is already in existing work ("Already explored in “Wish list”", "Already in Build as #138", "Already fixed in #127"), and "Looks right" reads "Add to “Wish list”" when an idea for it is being explored. Signals from the server now carry `existing`: the ideas and tickets for their problem. Nothing to do.
- Changed: Understand is now Personas: one list of the people who use the product, each with how many of their problems are open and how many things people like them said, leading to their page, where three tabs show their problems, everything people like them said, and the tests the kobold will run as them (to come). What came in to look at moves to Signals, and the Check-up's breadcrumb leads back there. Nothing to do.
- New: Signals (`#signals`, `#signals/<signal>`): what people said that nobody has looked at yet, one at a time in a big card. It shows what was said, where it came from and when, the person it sounds like as their little kobold, and what already exists for its problem when something does. Three buttons, Fix, Explore (or Add to the idea already explored) and Dismiss, with Looks right and Move in a "⋯" menu, and the next one shows. "3 of 14" with arrows (or ← →) goes through them; "Check my product" and "Add what people said" are at the top; when nothing is left it says "All caught up." Nothing to do.
- Changed: Settings is laid out across the whole page in three clearly separated sections, General (language, light or dark, side by side), Work (where work is tracked, always open with the one in use ticked and one short line for each choice, and the AI model) and Add-ons and kits (a wider grid), each under its own heading. Nothing to do.
- Changed: the sidebar follows the product's way in five pages: Home (the Overview), Signals (with how many new things people said), Explorations (Explore), Factory (Build, the board, unchanged) and Personas (Understand). At the bottom, one row: "Your kobold", which opens the chat, with a dot on the kobold for whether it is working (what it is doing is in the tooltip), and two icons, Product (with a red dot when part of the factory could not start) and Settings. The Check-up is reached from Signals; Workshop is gone: its add-ons and kits are on Settings. Every address still leads where it did (`#workshop`, `#workshop/add-ons` and `#add-ons` lead to Settings, `#system` to Product), and the new page is at `#signals`. The product's tile and switcher at the top of the sidebar are gone, and so is Ask the kobold at the top of every page (with ⌘K): asking is in the chat now. The bar at the top of a page shows only when the page has buttons. Customers is no longer listed while it is "coming soon" (its address still opens). Nothing to do.
- Changed: less to read. A stage on a card is only its dot and its name (every step stays on the page); the kobold's line says "13 new things to look at"; Explore's list no longer counts versions, a version says what it is doing only when it is not stopped, and "Open prototype mode" is "Try the versions". Settings is one column: where work is tracked says what it is now with "Change" folded away, and the AI model's help is one plain line. Nothing to do.
- Changed: Explore is a grid of idea cards in two groups, being explored and decided. Each card shows who the idea is for, where it stands and what is next, and a dashed card starts a new idea. An idea opens in a dialog over the grid (`#explore/<idea>` still works): its stage in one line, who it is for and what the team thinks, each version as one card with Try it and a vote ("Your vote", how many voted, "Most votes" on the one ahead), a "See all versions" link to prototype mode, and one row that sends the version with the most votes to Build or says why it cannot go yet (a tie, nobody has voted, or no GitHub board connected, with a way to Settings instead of failing when pressed). "Picks" are called votes. Nothing to do.
- Changed: prototype mode looks like the rest of Kobble. It sits on a dotted canvas, with a light bar on top (the idea, Main and the versions as tabs, Back to Explore, Share). The version shown is in a big rounded card that fades in when you switch, with which version it is and Stop at its foot. Beside it, the versions and a small chat with the kobold, like the Chat page: say what another version should do, and its reply follows the work until the version is ready to see. A project with no prototype command says so in plain words. Nothing to do.
- Changed: Understand is one list of what goes wrong for the people who use the product: each problem, for whom and where it stands, new ones first and the solved and the ones that didn't hold muted at the end, with a chip per person to show only theirs (with their real problem and a way to their page). A story is a timeline, one step per line: a check where it was seen (what was said on hover), a question mark where it is guessed, a cross where it goes wrong, and what they do instead last; under it what goes wrong, with the ideas for it, and what the kobold put in it to check. A person's page lists their problems the same way. "Add a source" is called "Add what people said". Nothing to do.
- Changed: on a wide screen the whole dashboard is one big card with rounded corners, floating on a dotted canvas (`bg-dots`, new variables `--canvas`, `--canvas-dot` and `--shadow-float`); a page fades in when you open it, and rows, pages in the sidebar and cards change on hover with a short transition (nothing moves with reduced motion). Build's columns reach down to the end of the page. Nothing to do.
- Changed: on Product the panel beside the map is always there. With nothing chosen it says what the map is in everyday words, how many pieces there are and how many run or need you, what the dots mean, and where the project is (folder, branch, where it is shared). Choosing a piece shows it in the panel, and "All pieces" or Escape goes back. Each card on the map is a button you can reach with the keyboard. The factory's own programs, if any, are listed under the map with their buttons and problems. The map reads again when products are added. Nothing to do.
- New: the Overview shows how things are moving as a river, from what was heard to what worked (Heard, Ideas, Sent to Build, In the app, Worked): each stage counts what reached it, the river is as wide there as that count, and its colour moves from Discovery's to Build's to green (colours checked for colour blindness, in light and dark); a line above says how it goes ("1 of 8 ideas worked so far · 3 being built"), and each stage leads to its page. Nothing to do.
- Changed: a new look: the font is no longer Onest (see the type scale above), and a new palette in light and dark: indigo buttons and Build, cyan Understand, amber Explore, green for what worked and rose for what didn't (see [the design system](docs/reference/design-system.md)). The theme variables keep their names, so a company's `factory/theme.css` keeps working; one that did not set `--primary` gets indigo buttons where they were dark. Nothing to do.
- Changed: the server refuses a request whose body is larger than 10 MB (413), and reads a body whole before it reads it as text, so a letter of more than one byte (è, an emoji) that arrived split is no longer garbled. The dashboard's files may no longer be shown in another site's frame (`X-Frame-Options: DENY`, `frame-ancestors 'none'`), and say `nosniff` and `Referrer-Policy: no-referrer`. Nothing to do.
- Changed: the records' database is refused, with why, by a core older than the one that made it, instead of being changed; a new database still says tables version 1. Nothing to do.
- New: the core's checks run on every pull request and push to main on GitHub (`.github/workflows/verify.yml`), on the Node version in `.nvmrc`. Nothing to do.
- New: [the security notes](SECURITY.md): what the factory protects, from whom, and its limits; and [a proposed decision](docs/decisions/0001-discovery-and-build.md) on Discovery and Build as two loops over the same records, with the board unchanged. Nothing to do.

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

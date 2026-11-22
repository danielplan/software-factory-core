# How the core is built

The core is a small kernel: it finds a company's products, loads the
extensions and kits the company uses, and puts together what they add. It
does almost nothing by itself; every feature, the ones shipped with the core
included, plugs in the same way.

## The layers

| Layer                      | Who owns it                              | What                                                                                                                                                                                         | Where                                                                                         |
| -------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Core**                   | the maintainer                           | loading products and extensions, parts, settings, running agents, working copies, the method, the knowledge base, voice                                                                      | `packages/core`, `packages/skills`, `packages/knowledge-base`, `packages/dashboard/src/voice` |
| **Core extensions**        | the maintainer                           | shipped with the core, on unless a company switches one off: Explore (ideas) and prototypes, Build (the board with its coach and builder), Home and System (what waits, the product's parts) | to come                                                                                       |
| **Add-ons**                | the maintainer, or a company for its own | chosen per company: made-up worlds                                                                                                                                                           | to come                                                                                       |
| **Kits**                   | the maintainer                           | one per kind of product: Expo app, React web app, SvelteKit web app, NestJS backend, TypeScript package                                                                                      | to come                                                                                       |
| **Products and knowledge** | the company                              | its apps and services, `docs/`, `runs/`, its own rules                                                                                                                                       | the company's repository                                                                      |

The rule for any piece: if it would be true for a different company, it is
core, an extension or a kit; otherwise it is the company's.

## Setting up a factory

One command, run in the project (`npx software-factory`, to come), opens
the dashboard in the browser. Where the project has no factory yet, it
starts with setting up: one conversation and one map, in two steps.
**The setup coach** (Claude Code on this computer, signed in with the
owner's own account, following the skills package's
`packages/skills/guides/setup-coach.md`) first plans the factory with the
owner. It explores the code with its own tools (never `.env` files) and
draws how the system works on the map with one tool of its own, `draw`:
small cards framed in areas, joined by arrows, with pictures from the
project, the parts and who uses them, the main workflows, and inside them
what the code cannot say (how real it is, what must never happen, the
project's words, what is still open), one area at a time, each card a
guess until the owner agrees. The owner moves or removes cards, and
changes one by clicking it and telling the coach. When the owner presses
**Build the factory**, the coach may write in the project and builds it
itself: the factory's own settings through its other tool, `configure`
(the project, which makes the folder; its products; the tracker, add-ons,
settings and tools to install from `packages/server/src/installables.ts`,
only as the owner agreed), checked as they are saved, and the blueprints
and knowledge pages with its own tools, until the factory's checks find
nothing. The owner then presses **Open the factory**. Right after, the dashboard guides
connecting where work is tracked: a GitHub board through the GitHub CLI on
this computer, or Jira Cloud with an API token, each checked before it is
saved (the GitHub and Jira add-ons, `packages/server/src/add-ons/`). In a new project
(`software-factory new <name>`), the plan starts from what the owner wants
to build. The owner can talk instead of typing: voice is part of
the core (`packages/dashboard/src/voice/`). Two speech models run in the
browser (Whisper): a quick one shows their words while they speak, an
accurate one writes the sentence as soon as they pause; the coach's answer is read
out loud as it is written (Piper, also in the browser), and saying "stop"
interrupts it. Nothing said leaves the computer except the written words
sent to the coach. There are two kinds of start:

- **Start something new** (greenfield): the company (the coach interviews the
  owner and writes the first knowledge pages), the first product (its kit
  creates it with the framework's own starter), where work is tracked, and the
  dashboard with the product running.
- **Bring an existing codebase** (brownfield): point at folders or
  repositories; each kit recognises its kind of product and the commands that
  already exist; the owner confirms each product found. Nothing in their code
  is changed: an agent drafts each product's blueprint and the knowledge pages
  from the code as it is, for the owner to review, and the product's own ways
  become its rules where they differ from the kit's. Trust grows step by step:
  ideas and plans first, then builds as pull requests checked by the
  company's existing CI.

**The factory lives in the project**, in its `factory/` folder, kept in the
same repository as the code: the company file, the product descriptions,
the knowledge base and the history change with the code they describe, in
the same commits and pull requests, and every copy of the code has them.
The project's own `AGENTS.md` (and `CLAUDE.md`) point to the factory's
rules, so any agent working in the code finds them. A team uses one
factory from several computers, one person each, and shares it only through
the repository; there is no server. The team's settings (the builder's cards
at once and model, whether the usage log is kept) are in `factory/team.env`,
which git keeps (the factory's `.gitignore` says `!team.env`, for projects
that ignore `*.env`). What must not be shared stays out of git
(`factory/.gitignore`): each person's own settings with their secrets
(`settings/`: tokens, the AI models, where the usage log is kept, Updates by
itself) and the agents' working copies (`copies/`). Settings saved in
`settings/factory.env` before 0.12.0 that are the team's are still read from
there, and move to `team.env` when the factory opens or the group is saved
(a setting group's `formerly`). The command finds the factory from anywhere
inside the project.

**Where work is tracked** is chosen right after the factory opens, and
changed on Settings: a GitHub board, or **Jira Cloud**; there is no board
of the factory's own. Work goes through one set of stages everywhere:
Backlog, To do, In progress, Review and Done, with no Planning (work is
thought through outside the factory, in explorations) (`STAGES`
in `packages/server/src/api.ts`). Connecting a board picks the label of
the work the factory takes in and matches its columns to these stages; the
factory's `board.json` keeps all of it, and only Jira's API token is kept
in the settings. Both trackers ship with the core; the builder works GitHub boards for now. In
Jira, issues move with the company's own workflow's transitions,
the coaching happens in the issue's comments, and the factory checks for
changed issues every minute (Jira's webhooks need a public address, and the
factory runs on this computer). **Where the code lives** (branches and pull
requests) is GitHub for now; GitLab or Bitbucket can be added as other code
hosts later.

## A company's factory folder

```text
acme/                    the project, one repository
├─ AGENTS.md             the project's rules, pointing to factory/AGENTS.md
├─ docs/                 what the company knows: its own docs and the
│                        knowledge base's sections, one space
├─ shop/                 a product's code, with product.json and BLUEPRINT.md
├─ orders/               another product, described the same way
└─ factory/              its factory
   ├─ AGENTS.md          the agents' ground rules and workflow
   ├─ factory.json       the company: its kits, add-ons and products' folders
   ├─ ideas/             the ideas shaped with the idea coach, one file each
   ├─ board.json         the connected board: label, a column per stage
   ├─ setup.json         the setup conversation and its map, kept
   ├─ team.env           the team's settings, in git
   ├─ runs/              its history
   ├─ kobble/            explorations, personas, tests, one file each, in git;
   │                     its signals/ stay on this computer (not in git)
   └─ settings/, copies/ secrets and working copies, not in git
```

Each product describes itself next to its code (`shop/product.json`: kind,
users, commands, what it needs and, when its kit cannot tell, its type:
screen, backend, data or outside service, which the System map shows;
`shop/BLUEPRINT.md`: its structure, promises and checks), and
`factory.json` lists the products' folders from the project's root, so the
project can move as a whole. What the company knows is one space with its
own documentation: the project's `docs/`, the knowledge base's sections beside
the pages it already had (from 0.6.0; before, `factory/context/` and
`factory/products/`, which the upgrade moves).

The core never names a product. It reads each product's description (see
`productSchema` in `packages/core/src/products/product.ts`) and the company
file (`companySchema` in `packages/core/src/company/company.ts`).

## Kobble's files

Kobble (the dashboard's name) works through one pipeline: Signals, then
Explorations, then the Factory board. It keeps its records as files in the
product's repository: `factory/kobble/signals/S-0001.json`,
`factory/kobble/explorations/X-1/exploration.json`,
`factory/kobble/personas/<id>.json`. They go
into git, so the team shares them like the code, except the signals: what
people said stays on the computer that read the live app (the factory's
`.gitignore` names `kobble/signals/`), since git would keep it for ever.
Each computer reads the live app for itself, and keeps where it got to beside
its signals, in `kobble/signals/.sync.json`, so a teammate's computer reads
from the beginning and has the signals too (before 0.12.0 it was
`kobble/sync.json`, in git; it is read when this computer has no place of
its own yet, and removed at the next sync). An
exploration keeps its own copy of what it heard (`heard` in
`exploration.json`: each signal's id, type, source, persona, time and
words), so it reads the same on a teammate's computer; a persona's page
shows the signals on this computer. Each is JSON, checked
against its schema (`packages/core/src/kobble/schemas.ts`) when it is read
and written, and written whole (to a file beside it, then renamed).

**Signals** come from the live app: the server reads its export
([the live export](reference/live-export.md)) when it starts, every 30
minutes while it runs, and on Sync now (`POST /api/kobble/sync`). Each event
becomes at most one signal, typed by its kind; its persona is the one whose
customers include the event's anonymous customer. Then a plain rule looks
for work that exists already (`packages/core/src/kobble/already.ts`): an
open exploration that covers at least half of the signal's content words,
or a fixed signal that says nearly the same. The kobold takes this over
later.

On the Signals page each signal gets **Fix** (a GitHub issue on the
connected board, in To do, with the signal's id in a hidden mark
`<!-- factory:kobble signal=<id> -->`; the signal goes to it), **Explore** (added to the exploration
found, or a new one that waits) or **Dismiss** (`POST
/api/kobble/signals/fix`, `/explore`, `/dismiss`). The Personas page lists
the personas with their signals (`GET /api/kobble/personas`,
`/api/kobble/persona?id=…`) and adds one (`POST /api/kobble/personas`). A persona's
file may give its kobold's face (`face`: a hat and a colour); otherwise it
comes from the persona's id (`packages/core/src/kobble/face.ts`).

**Persona tests**, called missions on the page
(`factory/kobble/tests/T-0001.json`), let the kobold use the app as one
persona would, on this computer only and never the live app
(`packages/server/src/kobble/persona-tests.ts`, with the `persona-test`
skill). Before launch they are where the first signals come from: the empty
Signals page sends the team to Personas. For each persona the kobold first
suggests one mission (`mission-ideas.ts`, Part 0 of the skill): a sentence
and the app (product) they would try it in, from who they are, the products
with a web address and their missions before; it is kept in memory until the
persona is sent, then the next is asked for. The product starts as the
factory starts it (the launcher, with its kit's command and port; two
missions needing it at once start it once); the persona agent sees it only
through a browser, Playwright's MCP server (`npx @playwright/mcp`, headless,
no saved profile), writes a `Step N: …` line before each step (kept in the
test's `doing` while it runs, so the page follows it) and keeps a diary of
each step: what it did, what it expected, and whether that happened. Then
the analyst turns the diary into signals (`bug`, `idea` or `question`,
source `test`, the persona set, in the person's words), each with the
`step` where it happened (the test, the step's number and what the persona
did), through the same "already" check. Up to 3 run at once and the others
wait; one at a time for each persona. A test that cannot run says why in its
`problem` (no product with a web address, the product does not start, no
browser, Claude Code missing). The routes: `GET /api/kobble/mission?persona=…`,
`POST /api/kobble/tests` (`persona`, `task`, `product`), `GET
/api/kobble/tests?persona=…`, `GET /api/kobble/test?id=…`; the personas on a
mission now come with the signals (`missions` in `GET /api/kobble/signals`)
and each persona says whether it is on one (`onMission`).

**Explorations** (`#explore`) are where the team works out what to build
for a problem, with the kobold
(`packages/server/src/kobble/explorations/`). Each has one board, a real
canvas (React Flow, laid out left to right along its arrows with ELK, pan
and zoom), kept in `explorations/X-1/board.json`: its things (the problem,
what we heard, notes, choices with options A, B, C, prototypes, diagrams in
Mermaid, pictures a person pasted or dropped in, kept in `pictures/`), the
arrows between them with short labels, the places people dragged things
to, and whether each is a sketch or agreed. A board in the first shape
(a question, options, prototypes and notes in lists) is read as things and
arrows (`packages/core/src/kobble/board-shape.ts`). The conversation with
the kobold is in `conversation.md`, with Claude Code's conversation id to
go on with it; it is the idea coach's talk (`coach/talk.ts`) with the
board's tools over MCP (`board-tools.ts`: look at the board, add notes,
diagrams and choices, change and remove things, link and unlink, point at
a thing, mark it agreed or a sketch). Its guide is
`packages/skills/guides/exploration-coach.md`. People move things, switch
sketch and agreed, choose an option, add pictures and click things to
attach them to what they type next; the kobold hears what they did with
their next words. The kobold makes a choice's prototype itself
(`prototypes.ts`, `making.ts`): one prototype on its branch
`proto/X-<n>-<key>`, in a copy of the code next to the project, holding the
options as **variants**, which the board switches outside the app through
the page address (`?variant=B`, `versions.ts`). It runs while it is made
(the maker's edits show as they happen) and starts again once they are
done; it opens on the page the change is on (`opens`). The maker has its
own tool over MCP (`maker-tools.ts`, `look_at_prototype`) to photograph it
running, and is made to look once when it did not (`looks.ts`); the kobold
reviews the pictures. The branch is pushed to origin once committed, so a
teammate's computer opens it from origin's branch (when it cannot be
pushed, or there is no origin, the board says it is only on this
computer); **Open** runs it with the project's `prototype.start` command,
one at a time, and the board shows it live;
**Test** starts a persona test on that branch, as the exploration's first
persona. **Hand off** writes `handoff.md` and makes a GitHub issue on the
connected board with the problem, the agreed prototype's branch and what
was learned; the exploration keeps the issue's number as `work`. The
routes are under `/api/kobble/explorations` (`GET` the list,
`GET /api/kobble/exploration?id=…`, `POST` new, `/start`, `/say`, `/board`,
`/picture`, `/make`, `/open`, `/test`, `/hand-off`, `/drop`).
Each change is told on the page's stream as a `kobble-changed` event.
`software-factory check` also checks these files and what they name.

**The Factory board** (`#build`, `GET /api/kobble/factory`,
`packages/server/src/kobble/factory-view.ts`) shows the connected GitHub
board's cards, as the builder last read them, in four columns: To do (with
the board's Backlog), Building, Review and Done. A card says
where it came from: an exploration whose `work` is its number, with the
agreed prototype, or a fixed signal. The builder and its switch work as
before.

**The builder keeps to its own cards** (`packages/server/src/builder/decide.ts`).
A card in In progress is the builder's only when its start (the note
`started`) is the factory's last word on it; a card a person moved there is
left to them. When the builder asks a question, cannot finish, or the checks
stay red after three rounds, it says why on the card, gives it the label
`factory: stuck` and moves it to Backlog. There it is not a new idea: the
Factory page shows it in **Stuck**, above the columns, with the builder's
suggested answers and a box for a hint; sending posts the hint as a comment
and moves the card to To do ("Your hint is with the builder"). Moving it to
To do on the board hands it back the same way. A card's branch is freed only
from the factory's own copies (`<project>-factory-copies/` and
`<project>-prototypes/`, `CopySettings.ownCopies`); open in any other copy,
the builder leaves the card to the person working there, with the note
`by-hand`.
A copy that lost its link to git (git's own folder for it is gone) is remade
at the start of the next turn: its folder is moved to `kept/` beside the
copies, uncommitted work included, never deleted, and the project forgets it
(`git worktree prune`) before a new copy is added.

## The feedback board

Every factory can send a wish or a bug to the people who make the core, with
nothing to host. They land on a public GitHub repository just for feedback,
`<owner>/software-factory-feedback`, beside the core's own (the owner is the
one in `RELEASE_SOURCE`); the person's code stays private. Sending uses their
own GitHub sign-in, the GitHub CLI's, as the factory's board does.

The dashboard side is Sprocket's window (`packages/dashboard/src/feedback/`):
"Ask Sprocket anything", "Send feedback" in the sidebar and "Report this
error" all open the same window. A wish or something wrong is told in words;
the kobold (a short script in the browser, not a model) asks one or two
questions, offers a 👍 on a similar post, and writes the post live in a card:
title, what happened, and what goes along (version, page, the errors the
factory caught). What looks like the team's data in it (repositories, quoted
titles, names) is marked, and the person can take it out before one Send.
Errors are caught in the page (`factory-errors.ts`); nothing leaves the
computer before Send.

The server side is `packages/server/src/feedback/`: `GET /api/feedback` (the
board's posts, who is signed in, what this person sent and where each stands),
`POST /api/feedback/send` and `POST /api/feedback/thumb`. A post is an issue;
its kind is the label `bug` or `wish`, and where it stands comes from the
issue: no label yet is **sent**, the label `seen` or `planned`, and a closed
issue is **done**. What a person sent is kept in
`factory/settings/feedback-sent.json` (never in git).

In the factory that reads the board (the makers' own: `FACTORY_FEEDBACK_READS=yes`
in `factory/team.env`), every open post that is not the person's own arrives
as a signal with the source `feedback` (once, every ten minutes and at
start): `sourceId` is `feedback-<issue number>`, `customer` the poster's GitHub
login. The kobold matches each new one to the persona it fits best, with a
short reason (`why`), or leaves it with none; `POST /api/feedback/persona`
changes or removes the match. On the Signals page, feedback is part of the one
list, with a Feedback filter, a "Feedback board" source label and the state of
the post.

## Releases of the products

The **Releases** page turns everything merged so far into a numbered release
of the product, in one click. A release is GitHub's own: a tag `v<x.y.z>` on
the main branch's latest commit and a GitHub release on it with the notes, so
nothing is stored in the factory's files and past releases are read back from
GitHub. It needs a connected GitHub repository (the page says so otherwise,
with a link to Settings) whose account may create tags and releases. It is one
release for the whole repository.

The server side is `packages/server/src/releases/`: `GET /api/releases` (the
coming release: the pull requests merged since the last tag, the suggested
number and why once the team prepared it, and the past releases),
`POST /api/releases/prepare` (the kobold judges what was merged and suggests
the number) and `POST /api/releases` (a number: tag and release). Both POSTs
are answered only from the factory's page and send a change event so the page
reads again. **The kobold is asked only on Prepare the release**: reading the
page uses no AI, and Release now uses the answer Prepare gave. It reads GitHub through the GitHub CLI
(`github-releases.ts`).

- **The last release** is the highest `vX.Y.Z` tag; tags of other shapes are
  ignored. A pull request is merged since then when its merge commit is among
  the commits `compare/v<last>...<main>` lists.
- **The number** follows [the rule the core uses for itself](releasing.md#which-number-to-raise)
  (`numbers.ts`): the last number goes up, the middle one only when people have
  to do something or something they relied on changes or goes away, the first
  one never by itself. The kobold gives that yes or no and the reason line from
  the merged titles and descriptions (`judge.ts`), when the team presses
  Prepare the release; when it cannot, the next patch is suggested without a
  reason. The first release is `0.1.0`. The team
  can change the number: it must be `x.y.z`, higher than the last, and not a
  tag that exists; the server refuses anything else, before tagging.
- **The notes** (`notes.ts`) are written from the merged pull requests, grouped
  by each card's type label (never by the title), each entry linking its pull
  request. The reason is kept in them as a hidden comment, so past releases show
  it. The card's type comes from the pull request's label, else from the card
  whose number is in the branch name `factory/issue-<n>`.
- With nothing merged since the last release, **Release now** is greyed out and
  the server refuses too.

What is not checked: the kobold's judgement on real merged work, and a real
release on a team's repository.

## Extension points

Two things extend a factory. A **kit** (`defineKit`) teaches it one kind of
product. An **add-on** gives it an ability a company may want, or want
another of in its place: in the core it is an extension (`defineExtension`),
and in the server an `AddOn` (`packages/server/src/add-ons/add-on.ts`), the
extension with the routes the server answers for it, at
`/api/add-ons/<id>/…` and only while it is on; its page, if any, is in
`packages/dashboard/src/add-ons/`. Built-in add-ons (`core: true`) are on
unless the company file switches them off (`without`); others are switched
on by name (`extensions`); the owner installs and removes them in the
dashboard's Marketplace, which also shows the connections (where the code and
the tasks are) and the kits. An extension says what it **brings** (pages,
Home blocks, kobolds, stages), what it **needs** (other extensions, by id),
the **slots** it uses (`code`, `tasks`: the jobs the factory fills once for
every extension) and whether it is **always** needed. Installing one brings
what it needs; removing one that another needs, or an always-needed one, is
refused; a factory with a need missing does not start, and says why
(`assembleFactory`). Kobble's own pieces are extensions too (Factory,
Explorations, Signals, Personas, Releases: `server/src/add-ons/kobble.ts`),
and the page of one that is removed leaves the sidebar. The first add-ons
are where work is tracked: a GitHub board and Jira Cloud (`tracker: true`),
shown as connections, not as extensions. What each adds:

| Point                              | What                                                                                                              | Today                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Parts                              | programs the factory starts, watches and stops                                                                    | extensions add their own; a kit makes the parts for each product of its kind (`partsFor`)                    |
| Settings groups                    | a topic, its `.env` file, its fields; shown on the Settings page                                                  | extensions                                                                                                   |
| Guides                             | Markdown joined to an agent's instructions (the coach, the prototype maker, the builder)                          | extensions and kits                                                                                          |
| Commands                           | the usual commands for a kind of product; a product's own win                                                     | kits                                                                                                         |
| Rules                              | conventions and lessons for a kind of product                                                                     | kits                                                                                                         |
| MCP servers                        | the tools agents use on a kind of product (its documentation, its checks), written into the project's `.mcp.json` | kits                                                                                                         |
| Pages, agent tools, workflow steps | the dashboard's pages, the coach's tools, the builder's steps                                                     | to come, with the core extensions                                                                            |
| Trackers                           | where work is tracked: a GitHub board, Jira Cloud                                                                 | add-ons (`tracker: true`, routes, connecting steps); the builder works GitHub boards (`server/src/builder/`) |
| Code hosts                         | where branches and pull requests go: GitHub                                                                       | GitHub, in the builder (`server/src/builder/pull-requests.ts`)                                               |
| Detection                          | a kit recognises its kind of product in existing code                                                             | to come, with the setup page                                                                                 |

Which add-ons the core ships, what each needs, and the order they come in:
[the add-ons](add-ons.md).

`assembleFactory` (in `packages/core/src/extensions/registry.ts`) puts a
company's factory together and says, in plain words, everything that does not
fit before anything starts: an unknown extension or kit, a product whose kind
has no kit, a part listed twice, a dependency that is not there.

## How companies update

- **The core:** a project installs it from this repository at a release's
  tag, pinned in its `package.json` ([releasing the core](releasing.md)).
  A company's `factory.json` says which version of the core its
  factory is on (`core`). `software-factory upgrade`, run in the project,
  brings it to the core the command comes from: it runs the migrations of
  every release in between (`packages/server/src/upgrade/migrations.ts`),
  refreshes what the factory owns in the project (the skills, the
  kits' MCP servers), writes the new version and runs the factory's checks.
  It says what it did and what it leaves to the owner; the owner reviews the
  changes and commits them. A company never edits the core; it uses an
  extension point, or asks for a change here.
- **Extensions and kits:** each has its own version and release notes, and is
  switched on or off in `factory.json`. A kit's rules are read-only in the
  company; the company and each product add their own on top, and where they
  differ, the product's rule wins, with the reason written down.
- **Their own work:** products, knowledge and own rules change through normal
  runs in the company's repository.
- **Lessons for everyone:** a lesson from a company that would hold for any
  company is marked as a suggestion for the core (the update-context skill),
  written without company details, and comes here as a change.

Every release is tried on the example company (`examples/acme/`) first.

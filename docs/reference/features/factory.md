# The Factory

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how do the Factory board and its builder work, from a card in To do to a pull request, and what happens when the builder is stuck?

## What it does

The Factory page (`#build`) shows the agreed work on the team's board, as the
builder last read it, in four columns: To do, Building (the board's In
progress), Review and Done. A card in **To do** is the go-ahead: there is no
planning stage ([decision 0002](../../decisions/0002-no-planning-stage.md)).
The board's Backlog is not agreed work: its open cards wait in
Explorations, and the cards the builder got stuck on show in **Stuck**,
above the columns. The builder's switch is at the top.

A card says where it came from (an exploration, with its agreed prototype,
or a fixed signal) and opens in a panel with its type, its plan, its pull
request, the conversation with the factory, the builder's steps and Delete.
A card whose pull request clashes with main has **Resolve**, which sends it
back to the builder to bring main in. The pull request's button has its
state's colour (see [the design system](../design-system.md#pieces)).

## The builder

**Bolt**, the builder, works the cards in To do, up to five at once (Settings
› AI models, "Cards at once"), each in a copy of its own next to the project.

1. It builds the card on its branch, `factory/issue-<number>`, test-first.
   The card's text is the plan
   ([decision 0004](../../decisions/0004-hand-off-card-is-the-plan.md)); a
   card with a prototype starts from the prototype's code and look
   ([decision 0003](../../decisions/0003-build-from-the-agreed-prototype.md)).
2. A build is up to three sessions in a row. A session that ends unfinished
   is followed by the next, with a short note on the card; two sessions in a
   row that add no commit end it.
3. Before a pull request it brings the knowledge base in line with what it
   built (`knowledge-kept.ts`). Then the factory runs each changed product's
   checks, the knowledge base's checks and a team extension's checks itself,
   and gives the builder up to three rounds to fix a failure.
4. Once they pass, the factory commits and pushes through the repository's
   own git hooks, and opens the pull request where the code lives, through
   the `code` slot. Only work whose checks pass is pushed; there are no draft
   pull requests ([decision 0007](../../decisions/0007-push-only-passing-work.md)).
5. Comments on the card or on the pull request in Review are answered on the
   same branch. It never merges.

Before each build or fix on a branch that exists, the latest main is merged
in, and again right before the checks and the pull request, since main moves
while a card is built (`builder/newest-main.ts`); a clash goes to the
builder to settle, or back to the team (Resolve).
When Claude's usage limit stops a job, the card says so and waits where it
is, and the factory carries on once the limit resets.

The board is read every minute. GitHub's signals about it come as they
happen (`gh webhook forward`, with no public address needed), and then the
timed reading is only the fallback.

The builder keeps to its own cards: a card in In progress is its own only
when its start is the factory's last word on it; a card a person moved there
is left to them. A card's branch open in a copy that is not the factory's is
left to the person working there.

## Stuck cards

When the builder asks a question, cannot finish, or the checks stay red after
three rounds, it says why on the card, labels it `factory: stuck` and moves
it to Backlog. The Factory page shows it in **Stuck**, with why in one line,
for how long, the builder's suggested answers and a box for a hint. Sending
posts the hint and moves the card to To do. Its unfinished work stays on the
branch in the factory's copy.

- **Out of sessions** is not a failure: it has its own note, and its button
  is **Continue**, a hint optional; it gives three more sessions
  ([decision 0008](../../decisions/0008-out-of-sessions-is-not-a-failure.md)).
- **Ask Sprocket** opens Sprocket's conversation about the card: Sprocket
  looks at the card and its branch, and sends the agreed answer on.
- Moving the card to To do on the board hands it back the same way.

## Rules that must hold

- The builder never merges, never pushes to main, and never skips the git
  hooks.
- Nothing in the builder, the card panel or Resolve names a code host.
- Work whose checks fail is never pushed.

## Where it lives

| Part                | Where                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The extension       | `packages/server/src/extensions/factory/` (`index.ts`, `factory-view.ts`, `card-look.ts`)                                                                    |
| The builder         | `packages/server/src/extensions/factory/builder/`: `decide.ts` (the rules), `sessions.ts`, `checks.ts`, `branches.ts` (`publishBranch`), `knowledge-kept.ts` |
| The page            | `packages/dashboard/src/extensions/factory/` (`factory-page.tsx`, `stuck-cards.tsx`, `card-panel.tsx`)                                                       |
| The builder's guide | `packages/skills/skills/factory/board.md`                                                                                                                    |
| The piece of work   | `packages/core/src/work/work.ts`: a card's stage, checks and history                                                                                         |

## Checked and not checked

Checked by tests: the builder's rules (`builder.test.ts`, `board-rules.test.ts`),
branches and pushes through the hooks (`branches.test.ts`), sessions and the
usage limit, stuck cards and answers, the card look. Not built: reading
Jira's cards; a code host other than GitHub.

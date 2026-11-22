# The feedback board

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: how does a team send a wish or a bug to the people who make Kobble, and how do the makers hear it?

## What it does

Every factory can send a wish or a bug to the people who make the core, with
nothing to host. Posts land on a public GitHub repository just for feedback,
`<owner>/software-factory-feedback`, beside the core's own (the owner is the
one in `RELEASE_SOURCE`); the team's code stays private. Sending uses the
person's own GitHub sign-in, the GitHub CLI's.

In Sprocket's window, a wish or something wrong is told in words. A short
script in the browser, not a model, asks one or two questions, offers a 👍 on
a similar post, and writes the post live in a card: title, what happened, and
what goes along (version, page, the errors the factory caught). What looks
like the team's data (repositories, quoted titles, names) is marked, and the
person can take it out before one **Send**. Nothing leaves the computer
before Send.

A post is an issue; its kind is the label `bug` or `wish`. Where it stands
comes from the issue: no label yet is **sent**, the label `seen` or
`planned`, and a closed issue is **done**. What a person sent is kept in
`factory/settings/feedback-sent.json`, never in git.

## In the makers' factory

In the factory that reads the board (`FACTORY_FEEDBACK_READS=yes` in
`factory/team.env`), every open post that is not the person's own arrives
as a signal with the source `feedback`, once, every ten minutes and at
start. A kobold matches each new one to the persona it fits best, with a
short reason, or leaves it with none; the team can change the match. On the
Signals page, feedback is part of the one list, with a Feedback filter.

## Where it lives

| Part             | Where                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| The server       | `packages/server/src/feedback/`: `board.ts`, `routes.ts`, `arrivals.ts` (posts as signals, through Signals' plug) |
| The window       | `packages/dashboard/src/features/support/`: `tell-kobold.ts`, `factory-errors.ts`                                 |
| The page's reads | `packages/dashboard/src/api/feedback-board.ts`                                                                    |

The routes: `GET /api/feedback`, `POST /api/feedback/send`,
`POST /api/feedback/thumb`, `POST /api/feedback/persona`.

## Checked and not checked

Checked by tests: posts, thumbs, where each stands, arrivals as signals
(`feedback.test.ts`). The feedback board runs the GitHub CLI itself, outside
the slots: see [the server's blueprint](../../../packages/server/BLUEPRINT.md).

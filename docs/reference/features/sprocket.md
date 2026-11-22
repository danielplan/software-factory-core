# Sprocket

[Knowledge base](../../index.md) · [Reference](../index.md) · [Features](index.md)

**Type:** Reference · Answers: what does Sprocket, the guide at the bottom of every page, do and not do, and how do extensions plug into it?

## What it does

**Sprocket** is always there, at the bottom of every page ("Ask Sprocket
anything"). People ask it how Kobble works, where something is, what the
other kobolds are doing, or something about their own product, and they bring
it what they want done. It is their guide: it finds out what they want,
takes them to the right place, and hands the work on to the kobold whose job
it is. It does nothing alone
([decision 0010](../../decisions/0010-sprocket-is-the-guide.md)).

- **Taking people somewhere** needs no yes: `go_to` a page, or what is open
  in it (`#explore/X-3`). Every hand-off also takes them where that kobold
  works.
- **Handing work on** always does: Sprocket says back in a line what it will
  hand to whom, and hands it on once they agree, only once.
- **What is the team's to do** (a release, a setting, moving a card) they do
  on its page: Sprocket takes them there and says what to press.
- **Something Kobble cannot do**, which would be an extension, is handed on
  as an idea to explore; the builder then writes the team's own extension.
  Sprocket is the only way to ask for one.

It reads the project and changes no file, card, release or setting. It
answers in at most 60 words, in the team's language.

## What extensions plug in

Each installed extension with a kobold plugs its hand-offs into Sprocket
(the `support` plug), with a paragraph of what Sprocket should know about it
and the pages it may take people to. Sprocket hears a plug only while its
extension is installed; when the team wants what an uninstalled extension
would do, Sprocket says so and takes them to the Marketplace.

| Extension    | Hand-offs                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Explorations | `explore_with_doodle`, `add_exploration`, `tell_doodle`, `list_explorations`                                                            |
| Personas     | `add_persona`, `send_on_mission`, `list_personas`                                                                                       |
| Signals      | `send_signal` (to the builder or Doodle), `list_new_signals`                                                                            |
| Factory      | `look_at_card` (the card, and on its branch the commits, changed files and run file), `answer_card` (the agreed answer on a stuck card) |
| Releases     | what Sprocket should know about releases                                                                                                |

A team's own extension can bring Sprocket a guide (`"agent": "support"`).

**New persona** and **New exploration** open Sprocket's conversation instead
of a form. **Ask Sprocket** on a stuck card opens the conversation about it.
The conversation lives while the factory runs; **New conversation** starts
again.

## Sprocket's window

"Ask Sprocket anything", "Send feedback" in the sidebar and "Report this
error" all open the same window. A question goes to Sprocket; a wish or
something wrong goes to [the feedback board](feedback-board.md).

## Where it lives

| Part       | Where                                                                                  |
| ---------- | -------------------------------------------------------------------------------------- |
| Sprocket   | `packages/server/src/kobble/support.ts`, `packages/server/src/kobble/support-tools.ts` |
| Its plug   | `packages/server/src/kobble/support-plug.ts`; each extension's `support.ts`            |
| Its guide  | `packages/skills/guides/support-kobold.md`                                             |
| The window | `packages/dashboard/src/features/support/`                                             |

The routes: `GET /api/kobble/support`, `POST /api/kobble/support`, `/new`,
`/stop`.

## Checked and not checked

Checked by tests: the plug (only installed extensions are heard, removing
one takes its hand-offs away), the tools and hand-offs, the card look
(`support-plug.test.ts`, `support-tools.test.ts`, `card-look.test.ts`).
Not checked by a test: how well Sprocket routes in a real conversation.

# Add a code host

[Knowledge base](../index.md) · [How-to guides](index.md)

**Type:** How-to · Answers: how do I add another place where the code lives, such as GitLab, so the builder pushes and opens merge requests there?

Where branches, pull requests and releases go is the `code` slot. The
builder, the card panel, Resolve, Releases and Settings › Updates ask the
slot for a **code host** and never name one
([decision 0009](../decisions/0009-code-host-from-the-code-slot.md)). GitHub
is the only filler today. Another host comes as an add-on that fills the
slot with its own code host.

## Steps

1. **Read the contract.** `CodeHost` in `packages/server/src/code-host.ts`:
   find, open and update a pull request, comment on one, check that the copy
   pushes there, link a file on a branch, and its `releases`: list the tags
   and the releases, the pull requests merged since a tag, make a release.
   GitHub's is `packages/server/src/extensions/github/code-host.ts` (its
   releases in `releases.ts` beside it).
2. **Make the add-on.** `packages/server/src/extensions/<id>/index.ts` (say `gitlab`), after
   `packages/server/src/extensions/github/index.ts`: a function that makes the
   module, so the tests can give it a stand-in for the host's command or API.
   Its declaration says `fills: ["code"]`; if it also tracks work, it says
   `tracker: true` and gives `tasks` too.
3. **Give its code host.** Return `codeHost: (repository) => …` from the
   module, doing each job of `CodeHost` with the host's own tools (its
   command-line tool or API). Pushes stay git's own, through the
   repository's hooks.
4. **Connecting.** Its routes under `/api/add-ons/<id>/…` (`addOnRoutes`) for
   signing in and choosing the repository, and its connecting steps on the
   page in `packages/dashboard/src/features/connect/`, words in three
   languages. A token goes in its settings group, on this computer only.
5. **Register it** in `packages/server/src/app/modules.ts`.
6. **Test** that the builder works a card through it with a stand-in, as
   `packages/server/test/builder-github.test.ts` does for GitHub, and that
   nothing in the builder changes.
7. **Docs:** add it to [plugs and slots](../reference/plugs-and-slots.md#slots)
   and [the Marketplace and extensions](../reference/features/marketplace-and-extensions.md).

## What still names GitHub

The feedback board and the Factory's webhook signals run the GitHub CLI
directly, outside the slot (see
[the server's blueprint](../../packages/server/BLUEPRINT.md)). Kobble's own
release notes are on GitHub, so a factory whose code host is not GitHub
shows the copy its Kobble carries.

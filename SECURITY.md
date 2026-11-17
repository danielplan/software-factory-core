# Security notes

What the factory protects, from whom, and where its limits are. Read it
before changing the server, the agents' permissions or the working copies.

## Reporting a problem

Tell the maintainer privately, not in a public issue: what you found, how
to see it happen, and which version of the core. A fix comes in a release
with a line in the changelog.

## What the factory is

One person runs the factory on their own computer, in their own project.
Its web server listens only on this computer (`127.0.0.1`), and the agents
are Claude Code, signed in with that person's own account. Anyone who can
already run programs as that person can read the project and its settings;
the factory does not try to protect against them.

## What it protects against

| From                                                                    | How                                                                                                                                                                                                                                                                                                     | Where                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Another web page open in the browser                                    | Buttons (every `POST`) need the header `x-software-factory: 1`. A page on another site cannot send a header of its own without the server's permission, which it never gives. The header is a check that the request comes from a page of the factory, not a password.                                  | `packages/server/src/server.ts`         |
| A site that renames itself to this computer (DNS rebinding)             | Only requests addressed to `localhost`, `127.0.0.1` or `[::1]` are answered.                                                                                                                                                                                                                            | `packages/server/src/server.ts`         |
| A page that puts the dashboard in a frame to make you press its buttons | The dashboard's files say they may never be framed (`X-Frame-Options`, `frame-ancestors`), are never read as another type (`nosniff`), and send no address on (`Referrer-Policy`).                                                                                                                      | `packages/server/src/http.ts`           |
| A runaway request                                                       | A body larger than 10 MB is refused (413) before it fills memory.                                                                                                                                                                                                                                       | `packages/server/src/http.ts`           |
| An agent writing where it should not                                    | Each run allows only the tools it needs; read-only jobs cannot edit; no run may push or use `gh` (the factory's own code does every GitHub write); Claude Code's Read tool may not open `.env` files (a shell command is not stopped: see the limits). Each kobold job has its own token for its tools. | `packages/core/src/agents/claude.ts`    |
| An agent changing the owner's folder                                    | Builds and prototypes work in their own copies of the code (git worktrees), on their own branches, never in the owner's folder or branch; copies get settings from the project's examples, never the owner's `.env`.                                                                                    | `packages/core/src/copies/workspace.ts` |
| Records made by a newer core                                            | An older core refuses to open them instead of changing them.                                                                                                                                                                                                                                            | `packages/core/src/records/store.ts`    |

## Its limits

- **The agents' rules are Claude Code's permission rules, not a sandbox
  of the operating system.** A run that may use the shell can do what the
  person can. Builds and prototypes run the project's own commands. Run the
  factory only on projects whose code you trust, as you would run their
  tests.
- **The factory's own commits skip the project's git hooks** (`LEFTHOOK=0`)
  on its work branches: a version's draft, and the builder's work on a
  card. They reach the main branch only through a pull request, which the
  project's own checks (CI) look at. People working on the core never skip
  the hooks (see `AGENTS.md`).
- **A prototype is shown in a frame at the address its start command
  prints** (`FACTORY_URL=`, `http` or `https` only). It is the company's
  own code, run on this computer.
- **Errors are shown as they are.** The page is only for the person
  running the factory, and the full message helps them most.

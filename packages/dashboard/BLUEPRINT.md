# Kobble's page blueprint

- **Kind:** react-web-app (see its `product.json`): it is built with the
  React web app kit's rules (`npx software-factory rules dashboard`, or
  `packages/kits/rules/react-web-app/`), like any product a factory makes.
- **Promises:** every word it shows is in English, Italian and German (see
  [languages](../../docs/reference/languages.md));
  it uses only the libraries the kit's table and the table below name.
- **Checks:** the core's `npm run verify` at the top of the repository;
  the import rules below with it (`npm run check:borders:dashboard`).

## Structure

The kit's folders, after Bulletproof React: shared folders, one folder per
area, and `app/` that puts them together. Code flows one way, shared
folders → features and extensions → app, checked by dependency-cruiser
(`.dependency-cruiser.cjs`, the kit's rules and Kobble's own).

Kobble's own rule, beside the kit's: **its extensions are modules**, as on
the server. Each one is a folder `src/extensions/<id>/` whose `index.tsx`
exports its module (`PageModule`, `src/lib/page-module.ts`): its pages by
address with their sidebar rows, its Home blocks and its settings sections.
`app/extensions.ts` lists them and puts together only the installed ones,
so a removed extension's page code is not mounted at all. The `index.tsx`
is the module's declaration, not a barrel: it re-exports nothing.

```text
src/main.tsx            the start: the company's theme, then the app
src/app/                the app, the frame around the pages (shell.tsx),
                        the pages by address (router.tsx, React Router
                        on the address after the #), the installed
                        extensions' modules (extensions.ts), and Settings
                        put together (settings-page.tsx)
src/api/                talking to the server: the requests (client.ts),
                        reading through TanStack Query (query.ts), the
                        factory's state and its stream of changes
                        (live.ts), one zod schema per kind of record the
                        server answers with, the source of its type
                        (schemas/), the feedback board
src/components/ui/      shadcn's pieces, as generated
src/components/layout/  the sidebar, the page's head, a problem's box
src/components/         pieces several areas share: the kobolds' faces,
                        Markdown, a block on Home, a settings card, the
                        voice's screens (voice/) …
src/hooks/              general hooks (the voice's in hooks/voice/)
src/lib/                general logic without screens (the voice's calls,
                        speech and hearing in lib/voice/); what an
                        extension brings to the page (page-module.ts)
src/i18n/               the words, in three languages, through i18next
                        (locales/<language>/<area>.json)
src/features/<area>/    one per core area: home, system, settings,
                        marketplace, setup, support (Sprocket and the
                        feedback it takes), updates, connect (where work
                        is tracked, with the GitHub and Jira steps)
src/extensions/<id>/    one per extension: factory, explorations, signals,
                        personas, releases; index.tsx is its module
```

A feature never imports another, the core never imports an extension, and
an extension never imports another or a core feature: Home gets the blocks
the installed extensions bring, Settings their sections and the sidebar
their rows, all from `app/`. What two areas share moves to a shared folder.

## Libraries

What Kobble's page needs beyond its kit's libraries. A row here is for a
job only Kobble has; a job other products would have too goes into the
kit's table instead.

| Job                      | Library                                                                                   | Why                                              |
| ------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Speaking aloud           | **Piper**, in the browser (`@mintplex-labs/piper-tts-web`, `@diffusionstudio/piper-wasm`) | natural voices without sending words to a server |
| Hearing speech           | **Whisper** through **Transformers.js** (`@huggingface/transformers`)                     | speech to text on the team's own computer        |
| Running the voice models | **ONNX Runtime Web** (`onnxruntime-web`)                                                  | the engine both voice libraries run on           |

## Where it still differs from its kit

Code written before Kobble was held to its kit. Each line is to be moved to
the kit's library, one card at a time; nothing new is added to it.

- **Forms:** the forms with fields (the live app's address and token, a
  persona added in setup, an answer to the coach's question) use
  react-hook-form with zod, their schemas in `src/lib/forms.ts`: a field
  that does not hold says why under it (`FieldProblem`) once something was
  typed in it; the chat boxes (Doodle's talk panel, the
  coach's answer box, Sprocket's box, an answer on a stuck card) still keep
  their text in component state, as voice, attachments and quick picks
  write into it too.
- **Tests:** the logic is tested with node's test runner (`test/`); there
  are no component tests with Testing Library and MSW, no click-throughs
  with Playwright, and no prototype mode.
- **Shared pieces with their own actions:** a few pieces in
  `src/components/` save what they show (a settings group's card,
  `settings-card.tsx`), where the kit keeps actions in the features.
- **One component per file:** some files still hold several small ones
  (`components/page-bits.tsx`, `components/settings-card.tsx`, the
  features' block and card files).
- **The theme file** is `src/index.css`, not `src/theme.css`.

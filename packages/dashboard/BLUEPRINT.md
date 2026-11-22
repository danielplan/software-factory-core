# Kobble's page blueprint

- **Kind:** react-web-app (see its `product.json`): it is built with the
  React web app kit's rules (`npx software-factory rules dashboard`, or
  `packages/kits/rules/react-web-app/`), like any product a factory makes.
- **Promises:** every word it shows is in English, Italian and German (see
  [the design system's languages](../../docs/reference/design-system.md#languages));
  it uses only the libraries the kit's table and the table below name.
- **Checks:** the core's `npm run verify` at the top of the repository;
  the import rules below with it (`npm run check:borders:dashboard`).

## Structure

The kit's folders, after Bulletproof React: shared folders, one folder per
area, and `app/` that puts them together. Code flows one way, shared
folders → features → app, checked by dependency-cruiser
(`.dependency-cruiser.cjs`, the kit's rules).

```text
src/main.tsx            the start: the company's theme, then the app
src/app/                the app, the frame around the pages (shell.tsx),
                        the pages by address (router.tsx), and what it puts
                        together: the blocks each feature brings to Home
                        (home-blocks.tsx), the cards each brings to
                        Settings (settings-page.tsx), the sidebar's rows
src/api/                talking to the server: the requests and the types
                        of its answers (client.ts), reading what a page
                        shows (use-read.ts and the hooks on it), the
                        feedback board
src/components/ui/      shadcn's pieces, as generated
src/components/layout/  the sidebar, the page's head, a problem's box
src/components/         pieces several areas share: the kobolds' faces,
                        Markdown, a block on Home, a settings card, the
                        voice's screens (voice/) …
src/hooks/              general hooks (the voice's in hooks/voice/)
src/lib/                general logic without screens (the voice's calls,
                        speech and hearing in lib/voice/)
src/i18n/               the words, in three languages
src/features/<area>/    one per extension: factory, explorations, signals,
                        personas, releases; one per core area: home,
                        system, settings, marketplace, setup, support
                        (Sprocket and the feedback it takes), updates,
                        connect (where work is tracked, with the GitHub
                        and Jira steps)
```

A feature never imports another: Home gets the blocks the features bring
from `app/home-blocks.tsx`, and Settings its cards from
`app/settings-page.tsx`. What two areas share moves to a shared folder.

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

- **Texts and languages:** a typed catalogue of its own
  (`src/i18n/`, `area(en, it, de)` and `useT()`), not i18next with
  react-i18next; its checks (`test/i18n.test.ts`,
  `test/words-in-catalogue.test.ts`) move to i18next's resources and
  eslint-plugin-i18next with it. First to move.
- **Pages and addresses:** written by hand on `location.hash`
  (`src/app/router.tsx`), not React Router.
- **Data from the server:** fetched by hand (`src/api/client.ts`,
  `src/api/use-read.ts`, effects in the components), not TanStack Query;
  answers are not checked with zod.
- **Forms:** fields kept in component state, not react-hook-form.
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

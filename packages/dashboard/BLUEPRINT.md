# Kobble's page blueprint

- **Kind:** react-web-app (see its `product.json`): it is built with the
  React web app kit's rules (`npx software-factory rules dashboard`, or
  `packages/kits/rules/react-web-app/`), like any product a factory makes.
- **Promises:** every word it shows is in English, Italian and German (see
  [the design system's languages](../../docs/reference/design-system.md#languages));
  it uses only the libraries the kit's table and the table below name.
- **Checks:** the core's `npm run verify` at the top of the repository.

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
  (`src/dashboard/dashboard.tsx`), not React Router.
- **Data from the server:** fetched by hand (`src/api.ts`, effects in the
  components), not TanStack Query; answers are not checked with zod.
- **Forms:** fields kept in component state, not react-hook-form.

# New backend

The NestJS kit's starter for a new backend: NestJS, Drizzle and PostgreSQL, with the kit's standards and checks, no features and no sign-in. The factory copies it into a new product's folder when a new NestJS backend is made ([BLUEPRINT](BLUEPRINT.md)).

## The database

The backend keeps its data in the PostgreSQL database that `DATABASE_URL` in `.env` names: copy `.env.example` to `.env`. It points at the local server of `compose.yaml`; change it to use another server.

- No PostgreSQL on this computer? With Docker, `npm run db:start` starts one (only reachable from this computer, port 55432) and waits until it answers; `npm run db:stop` stops it and keeps its data. Every backend made from the kit's starter shares this one server, each with its own databases.
- `npm run migrate` makes the database when it is missing and applies the database updates; `npm start` does it too.
- A working copy of the factory keeps its data apart: `DATABASE_NAME` names another database on the same server. A product gives each copy its own with `copyEnv` in its `product.json`, for example `"copyEnv": { "DATABASE_NAME": "new-backend-{port:<its id>}" }` (the copy's own port makes the name its own).
- For `npm run test:integration`, copy `.env.test.example` to `.env.test`. The tests use a database of their own, never the one in `.env`: each working copy gets one, named after the one in `.env.test` with a mark of its folder, made when missing; the test databases of copies that are gone are dropped.

## Run

Use Node.js 24.21 or newer. In this folder, run `npm ci`, then:

- `npm start` prepares the database, builds and starts the backend at `http://127.0.0.1:3000` (`HOST` and `PORT` in `.env` change it). This is what the factory runs.
- Every route answers under `/api` (a web app's `/api/...` calls, through its `BACKEND_URL`, reach it unchanged); `GET /health`, outside `/api`, answers `{ "status": "ok" }` once the database answers.
- `npm run start:dev` runs it with a rebuild on every change, for working on it by hand.

## Add a feature

A folder in `src/` with its module, controller, service, repository and rules (as the NestJS kit's conventions say), its tables in `src/database/<topic>-schema.ts` (re-exported from `schema.ts`), `npm run db:generate` for the database update, the module in `src/app.module.ts`, and its tests. Then:

- **Who may call each route:** a decorator from `src/common/access.decorator.ts` (`@Public()` today; sign-in adds its own). A route that names nobody answers 403 `route_closed`, and `test/routes.spec.ts` fails.
- **Refusals:** `throw new AppError(code, params?)` with a code from `src/common/error-codes.ts` (a new meaning, a new code), then `npm run codes:export` and commit `error-codes.json`, the list the apps translate. Every refusal answers `{ error, message, params?, fields? }`.
- **The made-up world:** each new table goes into every situation in `prototype-world/` (see below).

## The made-up world

`prototype-world/<key>.json` are the situations the factory's prototypes share (`name`, `about`, `clock`, `signed_in`, `tables`), written as this database's own tables. The product names the folder as its `world` in `product.json` and `npm run check:world` as its `checkWorld` command. `test/prototype-world.spec.ts` (in `npm test`) keeps every situation true to the schema: every table, no other, known columns, required values, references that point at a row; `npm run test:integration` also writes each situation into the test database. `test/world.ts` (`seed`) writes a situation into a database, for tests that start from one.

## Checks

Run `npm run verify`: format, ESLint and import rules, types, unused code (knip), copied code (jscpd), `db:check` (the migrations match the schema), `codes:check` (`error-codes.json` matches the codes), the tests with the coverage floor, and the build. `npm run test:integration` adds the real-database suites. Single test: `npx vitest run test/app.spec.ts`.

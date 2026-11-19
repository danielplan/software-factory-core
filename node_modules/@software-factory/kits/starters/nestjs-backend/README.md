# New backend

The NestJS kit's starter for a new backend: NestJS, Drizzle and PostgreSQL, with the kit's standards and checks, no features and no sign-in. The factory copies it into a new product's folder when a new NestJS backend is made ([BLUEPRINT](BLUEPRINT.md)).

## The database

The backend keeps its data in the PostgreSQL database that `DATABASE_URL` names: copy `.env.example` to `.env` and point it at the server and database you choose. Without `.env`, it uses `postgres://127.0.0.1:5432/new-backend`. For `npm run test:integration`, copy `.env.test.example` to `.env.test`, with a database of its own for the tests.

## Run

Use Node.js 24.21 or newer. In this folder, run `npm ci`, then:

- `npm run migrate` makes the database when it is missing and applies the database updates.
- `npm start` builds and starts the backend at `http://127.0.0.1:3000` (`HOST` and `PORT` in `.env` change it); `GET /health` answers `{ "status": "ok" }` once the database answers.
- `npm run start:dev` runs it with a rebuild on every change.

## Add a feature

A folder in `src/` with its module, controller, service, repository and rules (as the NestJS kit's conventions say), its tables in `src/database/<topic>-schema.ts` (re-exported from `schema.ts`), `npm run db:generate` for the database update, the module in `src/app.module.ts`, and its tests.

## Checks

Run `npm run verify`: format, ESLint and import rules, types, unused code (knip), copied code (jscpd), `db:check`, the tests and the build. `npm run test:integration` adds the real-database suite and the coverage floor. Single test: `npx vitest run test/app.spec.ts`.

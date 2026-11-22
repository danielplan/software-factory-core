# Backend starter blueprint

The NestJS kit's starter for a new backend. When the factory makes a new NestJS backend, it copies this whole folder (without `node_modules/`) into the new product's folder, puts the product's name in place of `new-backend` (the package name and the database names), and installs its packages. From then on this file is the product's own blueprint: change it as the backend grows, and keep every check below.

**Kind:** backend, following the NestJS kit's conventions (`rules/nestjs-backend/conventions.md` in the core's kits), trimmed to what an empty backend needs.

## Structure

```text
src/main.ts                    starts the server on HOST and PORT
src/app.module.ts              the whole backend: CommonModule, DatabaseModule, and each feature's module
src/setup-app.ts               Express settings shared by the server and the tests: every route under /api but /health, the body limit
src/common/                    the checked settings (environment.ts); who may call a route (access.decorator.ts, access.guard.ts); the refusals (error-codes.ts, app-error.ts, errors.filter.ts); the input check (validation.ts); all wired in common.module.ts
src/database/                  the pool and the Drizzle client, transactions through @nestjs-cls/transactional, the tables (schema.ts, none yet), /health, another database on the same server (database-url.ts)
src/<feature>/                 one Nest module per feature, laid out as the conventions say (none yet)
scripts/                       database.ts (make a database when missing, apply the updates, each working copy's test database), migrate.ts (npm run migrate), reset.ts (npm run db:reset), db-check.ts (npm run db:check), export-codes.ts (npm run codes:export, codes:check)
drizzle/                       the database updates drizzle-kit writes (none yet)
prototype-world/               the made-up world's situations, as this database's tables (one, with no tables yet)
test/                          Vitest with light-my-request; the routes' access check; the made-up world's check and seed (world.ts); the database suites run with npm run test:integration
compose.yaml                   a local PostgreSQL server (npm run db:start), shared by every backend made from the starter
error-codes.json               the refusal codes the apps translate, written by npm run codes:export
```

## Promises

- **The database is a setting:** `DATABASE_URL` in `.env` names the PostgreSQL database this backend keeps its data in, on whichever server the product uses (the local one of `compose.yaml`, a shared one, a hosted one); `DATABASE_NAME` names another database on the same server (a working copy's own). Its tests use a database of their own (`.env.test`), one per working copy. Where the database lives is the product's decision, written here when it is made.
- **The standards of the NestJS kit:** NestJS on its defaults, settings checked at start-up through `@nestjs/config` and read only through `ConfigService`, Drizzle with drizzle-kit migrations, repositories inside transactions, input checked by class-validator.
- **Every route says who may call it:** a route without an access decorator answers 403 `route_closed`, and `test/routes.spec.ts` fails.
- **Every refusal is a code:** `{ error, message, params?, fields? }`, with a code from `src/common/error-codes.ts`; `error-codes.json` lists them for the apps and `npm run codes:check` keeps it up to date. A server failure is logged and hides its details.
- **Under `/api`:** every route answers under `/api`, as the kit's web apps call it; `/health` stays outside.
- **No sign-in:** the starter has no accounts; the backend adds its own sign-in, and its access decorators, when its plan asks for it.
- **`/health` answers only once the database answers**, so the factory can wait for it. `npm start` prepares the database first.
- **The made-up world follows the schema:** a new table goes into every situation in `prototype-world/` in the same change.
- **The checks below stay at least as strict as they are:** tighten them freely, loosen one only with the owner's agreement. No inline `eslint-disable`.

## Commands and checks

| Command                       | What it does                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`              | every check: Prettier; ESLint (`strictTypeChecked`, SonarJS, Nest's rules, settings only through `ConfigService`, no `sql.raw`, size and complexity limits) and dependency-cruiser (features meet through their module, service or rules); TypeScript; knip; jscpd; `db:check` (drizzle/ matches the schema); `codes:check` (error-codes.json matches the codes); Vitest with the coverage floor; the build |
| `npm start`                   | makes and updates the database, builds, and runs the backend on `HOST`:`PORT` (127.0.0.1:3000 by default): what the factory runs                                                                                                                                                                                                                                                                            |
| `npm run start:dev`           | the backend with a rebuild on every change, for working on it by hand                                                                                                                                                                                                                                                                                                                                       |
| `npm run db:start`, `db:stop` | the local PostgreSQL server of `compose.yaml` (Docker), started and waited for, or stopped                                                                                                                                                                                                                                                                                                                  |
| `npm run migrate`             | makes the database in `DATABASE_URL` (or `DATABASE_NAME`) when missing, on its server, and applies the updates in `drizzle/`                                                                                                                                                                                                                                                                                |
| `npm run db:generate`         | writes the next database update into `drizzle/` from `src/database/*schema.ts`                                                                                                                                                                                                                                                                                                                              |
| `npm run codes:export`        | writes `error-codes.json` from `src/common/error-codes.ts`                                                                                                                                                                                                                                                                                                                                                  |
| `npm run check:world`         | checks the made-up world against the schema (the product's `checkWorld` command)                                                                                                                                                                                                                                                                                                                            |
| `npm run test:integration`    | every test, on this working copy's own test database (from `.env.test`), with the made-up world written into it and the coverage floor                                                                                                                                                                                                                                                                      |

## Open

- **No features yet:** the first feature adds its module, schema, migration, situations' rows and tests as the conventions say.
- **No sign-in:** `@Public()` is the only access decorator; sign-in brings its own.

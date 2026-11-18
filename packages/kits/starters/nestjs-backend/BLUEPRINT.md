# Backend starter blueprint

The NestJS kit's starter for a new backend. When the factory makes a new NestJS backend, it copies this whole folder (without `node_modules/`) into the new product's folder, puts the product's name in place of `new-backend` (the package name and the default database name), and installs its packages. From then on this file is the product's own blueprint: change it as the backend grows, and keep every check below.

**Kind:** backend, following the NestJS kit's conventions (`rules/nestjs-backend/conventions.md` in the core's kits), trimmed to what an empty backend needs.

## Structure

```text
src/main.ts                    starts the server on HOST and PORT
src/app.module.ts              the whole backend: CommonModule, DatabaseModule, and each feature's module
src/setup-app.ts               Express settings shared by the server and the tests
src/common/                    the checked settings (environment.ts) and the global ValidationPipe (common.module.ts)
src/database/                  the pool and the Drizzle client, transactions through @nestjs-cls/transactional, the tables (schema.ts, none yet), /health
src/<feature>/                 one Nest module per feature, laid out as the conventions say (none yet)
scripts/                       database.ts (make the database when missing, apply the updates), migrate.ts (npm run migrate), reset.ts (npm run db:reset), db-check.ts (npm run db:check)
drizzle/                       the database updates drizzle-kit writes (none yet)
test/                          Vitest with light-my-request; the database suite runs with npm run test:integration
```

## Promises

- **The database is a setting:** `DATABASE_URL` in `.env` names the PostgreSQL database this backend keeps its data in, on whichever server the product uses (a local one, a shared one, a hosted one). Without it, the backend uses `postgres://127.0.0.1:5432/new-backend`. Its tests use a database of their own (`.env.test`). Where the database lives is the product's decision, written here when it is made.
- **The standards of the NestJS kit:** NestJS on its defaults, settings checked at start-up through `@nestjs/config` and read only through `ConfigService`, Drizzle with drizzle-kit migrations, repositories inside transactions, input checked by class-validator.
- **No sign-in:** the starter has no accounts; the backend adds its own sign-in when its plan asks for it.
- **`/health` answers only once the database answers**, so the factory can wait for it.
- **The checks below stay at least as strict as they are:** tighten them freely, loosen one only with the owner's agreement. No inline `eslint-disable`.

## Commands and checks

| Command                          | What it does                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                 | every check: Prettier; ESLint (`strictTypeChecked`, SonarJS, Nest's rules, settings only through `ConfigService`, no `sql.raw`, size and complexity limits) and dependency-cruiser (features meet through their module, service or rules); TypeScript; knip; jscpd; `db:check` (drizzle/ matches the schema); Vitest; the build |
| `npm run migrate`                | makes the database in `DATABASE_URL` when missing, on its server, and applies the updates in `drizzle/`                                                                                                                                                                                                                         |
| `npm run db:generate`            | writes the next database update into `drizzle/` from `src/database/*schema.ts`                                                                                                                                                                                                                                                  |
| `npm run test:integration`       | every test, with the real database in `.env.test` and the coverage floor                                                                                                                                                                                                                                                        |
| `npm start`, `npm run start:dev` | the backend on `HOST`:`PORT` (127.0.0.1:3000 by default)                                                                                                                                                                                                                                                                        |

## Open

- **No features yet:** the first feature adds its module, schema, migration and tests as the conventions say.
- **No error codes:** the first feature that refuses a request adds the backend's error codes and an error filter that answers `{ error, message, params? }`.
